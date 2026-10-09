using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Xem và duyệt các yêu cầu hủy / đổi vé.
///
/// Hành khách xem yêu cầu của chính mình ở /my. Admin và Quản lý xem toàn bộ và quyết định
/// duyệt hoặc từ chối; chỉ tới lúc duyệt thì vé và ghế mới thực sự thay đổi.
///
/// Duyệt yêu cầu hủy một vé đã thanh toán thì tạo yêu cầu hoàn tiền (Refund) gắn với Id của yêu cầu này,
/// để quản lý xử lý ở mục Hoàn tiền. Vé chưa thanh toán (Held) hủy thì chỉ nhả chỗ.
/// </summary>
[ApiController]
[Route("api/ticket-change-requests")]
[Authorize]
public class TicketChangeRequestsController(
    AppDbContext db,
    AuditLogService audit,
    ISeatHoldService seatHolds,
    ITicketExchangeValidator exchangeValidator) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "system";

    /// <summary>Việt Nam không dùng giờ mùa hè nên dùng độ lệch cố định.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>
    /// Hàng dữ liệu phẳng đọc từ cơ sở dữ liệu. Phải chiếu ra kiểu này NGAY trong truy vấn
    /// để EF dịch các navigation property thành JOIN; nếu nạp entity trước rồi mới chiếu ở
    /// bộ nhớ thì Ticket, Trip, Passenger... đều null và sinh NullReferenceException.
    /// </summary>
    private sealed class Row
    {
        public long Id { get; init; }
        public ChangeRequestType RequestType { get; init; }
        public ChangeRequestStatus Status { get; init; }
        public string? Reason { get; init; }
        public DateTime CreatedAt { get; init; }
        public DateTime? ProcessedAt { get; init; }
        public string? ProcessedByName { get; init; }
        public long TicketId { get; init; }
        public string BookingCode { get; init; } = string.Empty;
        public string SeatCode { get; init; } = string.Empty;
        public TicketStatus TicketStatus { get; init; }
        public decimal FinalAmount { get; init; }
        public int SeatCount { get; init; }
        public long TripId { get; init; }
        public string RouteCode { get; init; } = string.Empty;
        public string RouteName { get; init; } = string.Empty;
        public DateTime DepartureAt { get; init; }
        public string? BusPlate { get; init; }
        public long? NewTripId { get; init; }
        public DateTime? NewDepartureAt { get; init; }
        public string? NewBusPlate { get; init; }
        public long? NewSeatId { get; init; }
        public string? NewSeatCode { get; init; }
        public long PassengerId { get; init; }
        public string PassengerName { get; init; } = string.Empty;
        public string? PassengerPhone { get; init; }
    }

    /// <summary>Chạy truy vấn và chuyển sang DTO. Định dạng ngày/giờ làm sau khi đã đọc xong.</summary>
    private static async Task<List<TicketChangeRequestDto>> ToDtoListAsync(
        IQueryable<TicketChangeRequest> source, CancellationToken ct)
    {
        var rows = await source
            .Select(r => new Row
            {
                Id = r.Id,
                RequestType = r.RequestType,
                Status = r.Status,
                Reason = r.Reason,
                CreatedAt = r.CreatedAt,
                ProcessedAt = r.ProcessedAt,
                ProcessedByName = r.Processor != null ? r.Processor.FullName : null,
                TicketId = r.TicketId,
                BookingCode = r.Ticket.Booking.BookingCode,
                SeatCode = r.Ticket.Seat.SeatCode,
                TicketStatus = r.Ticket.Status,
                FinalAmount = r.Ticket.Booking.FinalAmount,
                SeatCount = r.Ticket.Booking.Tickets.Count,
                TripId = r.Ticket.TripId,
                RouteCode = r.Ticket.Trip.BusRoute.Code,
                RouteName = r.Ticket.Trip.BusRoute.Name,
                DepartureAt = r.Ticket.Trip.DepartureAt,
                BusPlate = r.Ticket.Trip.Bus != null ? r.Ticket.Trip.Bus.PlateNumber : null,
                NewTripId = r.NewTripId,
                NewDepartureAt = r.NewTrip != null ? (DateTime?)r.NewTrip.DepartureAt : null,
                NewBusPlate = r.NewTrip != null && r.NewTrip.Bus != null ? r.NewTrip.Bus.PlateNumber : null,
                NewSeatId = r.NewSeatId,
                NewSeatCode = r.NewSeat != null ? r.NewSeat.SeatCode : null,
                PassengerId = r.Ticket.Booking.PassengerId,
                PassengerName = r.Ticket.Booking.Passenger.FullName,
                PassengerPhone = r.Ticket.Booking.Passenger.Phone
            })
            .ToListAsync(ct);

        // Định dạng theo giờ Việt Nam làm ở bộ nhớ: DepartureAt lưu UTC và ToString có
        // định dạng thì không dịch được sang SQL.
        return rows.Select(r =>
        {
            var localDeparture = r.DepartureAt + VietnamOffset;
            var newLocal = r.NewDepartureAt.HasValue ? r.NewDepartureAt.Value + VietnamOffset : (DateTime?)null;

            return new TicketChangeRequestDto
            {
                Id = r.Id,
                RequestType = r.RequestType.ToString(),
                Status = r.Status.ToString(),
                Reason = r.Reason,
                // Mốc thời gian lưu UTC. Trả ra chuỗi đã đổi sang giờ Việt Nam, giống cách
                // xử lý giờ xuất bến: nếu trả DateTime thô không kèm múi giờ thì trình duyệt
                // coi đó là giờ máy và hiện lệch 7 tiếng.
                CreatedAt = (r.CreatedAt + VietnamOffset).ToString("yyyy-MM-dd HH:mm"),
                ProcessedAt = r.ProcessedAt.HasValue
                    ? (r.ProcessedAt.Value + VietnamOffset).ToString("yyyy-MM-dd HH:mm")
                    : null,
                ProcessedByName = r.ProcessedByName,
                TicketId = r.TicketId,
                BookingCode = r.BookingCode,
                SeatCode = r.SeatCode,
                TicketStatus = r.TicketStatus.ToString(),
                // Lượt đặt lưu tổng tiền và backend tính tổng bằng đơn giá × số ghế, nên
                // chia cho số vé là con số đúng, không phải ước lượng.
                TicketPrice = r.SeatCount > 0 ? r.FinalAmount / r.SeatCount : r.FinalAmount,
                TripId = r.TripId,
                RouteCode = r.RouteCode,
                RouteName = r.RouteName,
                DepartureDate = localDeparture.ToString("yyyy-MM-dd"),
                DepartureTime = localDeparture.ToString("HH:mm"),
                BusPlate = r.BusPlate ?? string.Empty,
                NewTripId = r.NewTripId,
                NewDepartureDate = newLocal?.ToString("yyyy-MM-dd"),
                NewDepartureTime = newLocal?.ToString("HH:mm"),
                NewBusPlate = r.NewBusPlate,
                NewSeatId = r.NewSeatId,
                NewSeatCode = r.NewSeatCode,
                PassengerId = r.PassengerId,
                PassengerName = r.PassengerName,
                PassengerPhone = r.PassengerPhone
            };
        }).ToList();
    }

    /// <summary>Yêu cầu của chính hành khách đang đăng nhập, mới nhất lên đầu.</summary>
    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<TicketChangeRequestDto>>> GetMine(CancellationToken ct)
    {
        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        var query = db.TicketChangeRequests
            .AsNoTracking()
            .Where(r => r.Ticket.Booking.PassengerId == passengerId.Value)
            .OrderByDescending(r => r.CreatedAt);

        return Ok(await ToDtoListAsync(query, ct));
    }

    /// <summary>
    /// Toàn bộ yêu cầu, cho Admin và Quản lý. Lọc theo trạng thái qua tham số status
    /// (Pending, Approved, Rejected); để trống thì trả tất cả, đang chờ lên đầu.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<TicketChangeRequestDto>>> GetAll(
        [FromQuery] string? status, CancellationToken ct)
    {
        var query = db.TicketChangeRequests.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<ChangeRequestStatus>(status, true, out var parsed))
            {
                return BadRequest(new { message = "Trạng thái không hợp lệ. Dùng Pending, Approved hoặc Rejected." });
            }
            query = query.Where(r => r.Status == parsed);
        }

        // Đang chờ lên trước để quản lý thấy việc cần làm ngay, trong mỗi nhóm thì mới nhất trước.
        var ordered = query
            .OrderBy(r => r.Status == ChangeRequestStatus.Pending ? 0 : 1)
            .ThenByDescending(r => r.CreatedAt);

        return Ok(await ToDtoListAsync(ordered, ct));
    }

    /// <summary>
    /// Duyệt một yêu cầu. Đây là lúc vé và ghế thực sự thay đổi.
    ///
    /// Mọi điều kiện được kiểm lại từ đầu: giữa lúc khách gửi và lúc quản lý bấm duyệt,
    /// chuyến có thể đã khởi hành hoặc ghế đích đã bị người khác đặt.
    /// </summary>
    [HttpPost("{id:long}/approve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Approve(long id, CancellationToken ct)
    {
        var actorId = GetActorId();
        if (actorId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var request = await db.TicketChangeRequests
                .Include(r => r.Ticket).ThenInclude(t => t.Booking)
                .Include(r => r.Ticket).ThenInclude(t => t.Trip)
                .Include(r => r.Ticket).ThenInclude(t => t.Seat)
                .FirstOrDefaultAsync(r => r.Id == id, ct);

            if (request == null)
            {
                return NotFound(new { message = $"Không tìm thấy yêu cầu có mã ID = {id}!" });
            }

            if (request.Status != ChangeRequestStatus.Pending)
            {
                return BadRequest(new { message = $"Yêu cầu này đã được xử lý (trạng thái {request.Status})!" });
            }

            var ticket = request.Ticket;

            if (ticket.Status is not (TicketStatus.Held or TicketStatus.Valid))
            {
                return BadRequest(new { message = $"Vé {ticket.Seat.SeatCode} không còn hiệu lực (trạng thái {ticket.Status}), không thể duyệt!" });
            }

            if (ticket.Trip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe của vé đã khởi hành, không thể duyệt yêu cầu này!" });
            }

            var now = DateTime.UtcNow;
            long? newTicketId = null;
            string? newSeatCode = null;
            var bookingCancelled = false;

            if (request.RequestType == ChangeRequestType.Cancel)
            {
                // Chuyển sang Cancelled làm ActiveSeatKey về NULL, nhờ đó ghế bán lại được ngay.
                ticket.Status = TicketStatus.Cancelled;

                // Vé đã thanh toán thì tạo yêu cầu hoàn tiền để quản lý xử lý ở mục Hoàn tiền.
                await PaymentRules.CreateTicketRefundAsync(db, ticket, request.Id, RefundReason.TicketCancelled, now, ct);

                // Lượt đặt không còn vé nào còn hiệu lực thì đóng luôn, nếu không nó treo ở
                // Pending vĩnh viễn và vẫn bị tính vào các báo cáo "đang chờ".
                var remainingActive = await db.Tickets
                    .CountAsync(t => t.BookingId == ticket.BookingId
                                  && t.Id != ticket.Id
                                  && (t.Status == TicketStatus.Held || t.Status == TicketStatus.Valid || t.Status == TicketStatus.Used), ct);

                if (remainingActive == 0 && ticket.Booking.Status is BookingStatus.Pending or BookingStatus.Confirmed)
                {
                    ticket.Booking.Status = BookingStatus.Cancelled;
                    bookingCancelled = true;
                }
            }
            else
            {
                if (request.NewTripId is null || request.NewSeatId is null)
                {
                    return BadRequest(new { message = "Yêu cầu đổi vé thiếu thông tin chuyến hoặc ghế mới!" });
                }

                var newTrip = await db.Trips.FirstOrDefaultAsync(t => t.Id == request.NewTripId.Value, ct);
                if (newTrip == null)
                {
                    return BadRequest(new { message = "Chuyến xe mới trong yêu cầu không còn tồn tại!" });
                }

                // Kiểm lại toàn bộ bằng đúng bộ quy tắc đã dùng lúc khách gửi yêu cầu.
                var validation = await exchangeValidator.ValidateAsync(ticket, newTrip, request.NewSeatId.Value, ct);
                if (!validation.IsValid)
                {
                    await transaction.RollbackAsync(ct);
                    return StatusCode(validation.StatusCode, new { message = validation.Message });
                }

                var newSeat = validation.Seat!;
                await seatHolds.ReleaseStaleHoldsAsync(newTrip.Id, [newSeat.Id], ct);

                // Vé cũ sang Exchanged: trạng thái này không nằm trong tập mà ActiveSeatKey coi
                // là đang chiếm, nên ghế cũ tự được nhả.
                ticket.Status = TicketStatus.Exchanged;

                var newTicket = new Ticket
                {
                    BookingId = ticket.BookingId,
                    TripId = newTrip.Id,
                    SeatId = newSeat.Id,
                    BoardStopId = ticket.BoardStopId,
                    AlightStopId = ticket.AlightStopId,
                    Status = ticket.Status == TicketStatus.Valid ? TicketStatus.Valid : TicketStatus.Held,
                    QrCode = Guid.NewGuid().ToString("N")
                };
                db.Tickets.Add(newTicket);
                await db.SaveChangesAsync(ct);

                newTicketId = newTicket.Id;
                newSeatCode = newSeat.SeatCode;
            }

            request.Status = ChangeRequestStatus.Approved;
            request.ProcessedBy = actorId;
            request.ProcessedAt = now;

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            await audit.WriteAsync(actorId, GetActorName(), "APPROVE_TICKET_CHANGE_REQUEST", AuditActionType.Update,
                $"CHANGE-REQUEST-{request.Id}",
                details: $"Duyệt yêu cầu {request.RequestType} cho vé {request.TicketId}", ct: ct);

            return Ok(new ApproveChangeRequestResultDto
            {
                Message = request.RequestType == ChangeRequestType.Cancel
                    ? "Đã duyệt yêu cầu hủy vé. Ghế được trả lại hệ thống."
                    : "Đã duyệt yêu cầu đổi vé. Vé mới đã được phát.",
                ChangeRequestId = request.Id,
                Status = request.Status.ToString(),
                NewTicketId = newTicketId,
                NewSeatCode = newSeatCode,
                BookingCancelled = bookingCancelled,
                RefundAmount = 0m
            });
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            return Conflict(new { message = "Ghế vừa bị người khác đặt đồng thời! Không thể duyệt yêu cầu đổi vé này." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            return StatusCode(500, new { message = "Lỗi hệ thống khi duyệt yêu cầu!", detail = ex.Message });
        }
    }

    /// <summary>Từ chối một yêu cầu. Vé và ghế không thay đổi gì.</summary>
    [HttpPost("{id:long}/reject")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Reject(long id, CancellationToken ct)
    {
        var actorId = GetActorId();
        if (actorId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        var request = await db.TicketChangeRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (request == null)
        {
            return NotFound(new { message = $"Không tìm thấy yêu cầu có mã ID = {id}!" });
        }

        if (request.Status != ChangeRequestStatus.Pending)
        {
            return BadRequest(new { message = $"Yêu cầu này đã được xử lý (trạng thái {request.Status})!" });
        }

        request.Status = ChangeRequestStatus.Rejected;
        request.ProcessedBy = actorId;
        request.ProcessedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(actorId, GetActorName(), "REJECT_TICKET_CHANGE_REQUEST", AuditActionType.Update,
            $"CHANGE-REQUEST-{request.Id}",
            details: $"Từ chối yêu cầu {request.RequestType} cho vé {request.TicketId}", ct: ct);

        return Ok(new ApproveChangeRequestResultDto
        {
            Message = "Đã từ chối yêu cầu. Vé của hành khách không thay đổi.",
            ChangeRequestId = request.Id,
            Status = request.Status.ToString(),
            RefundAmount = 0m
        });
    }
}
