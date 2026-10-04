using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Hủy vé và đổi vé cho hành khách.
///
/// Mỗi thao tác đều ghi một bản vào ticket_change_requests để lưu vết, với trạng thái
/// Approved vì hành khách tự phục vụ và thao tác có hiệu lực ngay. ProcessedBy để null:
/// không có nhân viên nào duyệt, và cột này là khóa ngoại sang accounts dành cho người xử lý.
///
/// Chưa tạo hồ sơ hoàn tiền: refunds.PaymentId là NOT NULL trỏ sang payments, mà hệ thống
/// chưa có luồng thanh toán nên không tồn tại giao dịch nào để hoàn. Vé hiện dừng ở trạng
/// thái Held (giữ chỗ, chưa trả tiền), nên hủy vé thực chất là nhả chỗ và số tiền hoàn là 0.
/// Khi nào có thanh toán thì chỗ cần bổ sung là tạo Refund gắn vào ChangeRequestId đã lưu.
/// </summary>
[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(AppDbContext db, AuditLogService audit, ISeatHoldService seatHolds) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "Customer";

    /// <summary>Việt Nam không dùng giờ mùa hè nên dùng độ lệch cố định.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Các trạng thái vé còn có thể hủy hoặc đổi.</summary>
    private static bool IsActionable(TicketStatus status) =>
        status is TicketStatus.Held or TicketStatus.Valid;

    private static string DescribeStatus(TicketStatus status) => status switch
    {
        TicketStatus.Used => "đã được sử dụng",
        TicketStatus.Cancelled => "đã bị hủy trước đó",
        TicketStatus.Exchanged => "đã được đổi sang vé khác",
        TicketStatus.Expired => "đã hết hạn giữ chỗ",
        _ => status.ToString()
    };

    /// <summary>
    /// Hủy một vé của chính mình. Ghế được nhả ngay cho khách khác.
    /// </summary>
    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> CancelTicket(long id, [FromBody] CancelTicketDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var ticket = await db.Tickets
                .Include(t => t.Booking)
                .Include(t => t.Trip)
                .Include(t => t.Seat)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (ticket == null)
            {
                return NotFound(new { message = $"Không tìm thấy vé có mã ID = {id}!" });
            }

            // Trả 404 thay vì 403 khi vé thuộc người khác: 403 sẽ tiết lộ rằng mã vé đó tồn tại.
            if (ticket.Booking.PassengerId != passengerId.Value)
            {
                return NotFound(new { message = $"Không tìm thấy vé có mã ID = {id}!" });
            }

            if (!IsActionable(ticket.Status))
            {
                return BadRequest(new { message = $"Vé {ticket.Seat.SeatCode} {DescribeStatus(ticket.Status)}, không thể hủy!" });
            }

            if (ticket.Trip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe đã khởi hành, không thể hủy vé!" });
            }

            var now = DateTime.UtcNow;

            // Chuyển sang Cancelled làm ActiveSeatKey về NULL, nhờ đó ghế bán lại được ngay.
            ticket.Status = TicketStatus.Cancelled;

            var changeRequest = new TicketChangeRequest
            {
                TicketId = ticket.Id,
                RequestType = ChangeRequestType.Cancel,
                Reason = dto.Reason.Trim(),
                Status = ChangeRequestStatus.Approved,
                ProcessedAt = now,
                CreatedAt = now
            };
            db.TicketChangeRequests.Add(changeRequest);

            // Lượt đặt không còn vé nào còn hiệu lực thì đóng luôn, nếu không nó treo ở
            // Pending vĩnh viễn và vẫn bị tính vào các báo cáo "đang chờ".
            var remainingActive = await db.Tickets
                .CountAsync(t => t.BookingId == ticket.BookingId
                              && t.Id != ticket.Id
                              && (t.Status == TicketStatus.Held || t.Status == TicketStatus.Valid || t.Status == TicketStatus.Used), ct);

            var bookingCancelled = false;
            if (remainingActive == 0 && ticket.Booking.Status is BookingStatus.Pending or BookingStatus.Confirmed)
            {
                ticket.Booking.Status = BookingStatus.Cancelled;
                bookingCancelled = true;
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            await audit.WriteAsync(passengerId, GetActorName(), "CANCEL_TICKET", AuditActionType.Update,
                $"TICKET-{ticket.Id}", details: dto.Reason.Trim(), ct: ct);

            return Ok(new CancelTicketResultDto
            {
                Message = "Đã hủy vé thành công!",
                TicketId = ticket.Id,
                SeatCode = ticket.Seat.SeatCode,
                ChangeRequestId = changeRequest.Id,
                // Luôn 0 ở thời điểm này: chưa có luồng thanh toán nên không tồn tại giao dịch
                // nào để hoàn. Giữ trường này trong DTO để khi có thanh toán thì chỉ cần điền.
                RefundAmount = 0m,
                BookingCancelled = bookingCancelled
            });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            return StatusCode(500, new { message = "Lỗi hệ thống khi hủy vé!", detail = ex.Message });
        }
    }

    /// <summary>
    /// Đổi một vé của chính mình sang chuyến khác và ghế khác. Vé cũ chuyển sang Exchanged,
    /// một vé mới được phát trong cùng lượt đặt.
    /// </summary>
    [HttpPost("{id:long}/exchange")]
    public async Task<IActionResult> ExchangeTicket(long id, [FromBody] ExchangeTicketDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var ticket = await db.Tickets
                .Include(t => t.Booking)
                .Include(t => t.Trip)
                .Include(t => t.Seat)
                .FirstOrDefaultAsync(t => t.Id == id, ct);

            if (ticket == null || ticket.Booking.PassengerId != passengerId.Value)
            {
                return NotFound(new { message = $"Không tìm thấy vé có mã ID = {id}!" });
            }

            if (!IsActionable(ticket.Status))
            {
                return BadRequest(new { message = $"Vé {ticket.Seat.SeatCode} {DescribeStatus(ticket.Status)}, không thể đổi!" });
            }

            if (ticket.Trip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe đã khởi hành, không thể đổi vé!" });
            }

            if (dto.NewTripId == ticket.TripId && dto.NewSeatId == ticket.SeatId)
            {
                return BadRequest(new { message = "Chuyến và ghế mới trùng với vé hiện tại!" });
            }

            var newTrip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.NewTripId, ct);
            if (newTrip == null)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.NewTripId}!" });
            }

            if (newTrip.Status is TripStatus.Cancelled or TripStatus.Completed)
            {
                return BadRequest(new { message = "Chuyến xe mới đã bị hủy hoặc đã kết thúc, không thể đổi sang!" });
            }

            if (newTrip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe mới đã khởi hành, không thể đổi sang!" });
            }

            // Hành trình của vé phải tồn tại trên tuyến của chuyến mới và giữ đúng chiều,
            // nếu không vé sau khi đổi sẽ ghi một hành trình không có thật.
            var stopOrders = await db.RouteStops
                .Where(rs => rs.RouteId == newTrip.RouteId &&
                             (rs.StopId == ticket.BoardStopId || rs.StopId == ticket.AlightStopId))
                .Select(rs => new { rs.StopId, rs.StopOrder })
                .ToListAsync(ct);

            var boardOrder = stopOrders.FirstOrDefault(x => x.StopId == ticket.BoardStopId)?.StopOrder;
            var alightOrder = stopOrders.FirstOrDefault(x => x.StopId == ticket.AlightStopId)?.StopOrder;

            if (boardOrder is null || alightOrder is null)
            {
                return BadRequest(new { message = "Chuyến xe mới không đi qua điểm lên hoặc điểm xuống của vé này!" });
            }

            if (boardOrder >= alightOrder)
            {
                return BadRequest(new { message = "Trên tuyến của chuyến mới, điểm lên của vé lại nằm sau điểm xuống!" });
            }

            var newSeat = await db.Seats.FirstOrDefaultAsync(s => s.Id == dto.NewSeatId && s.BusId == newTrip.BusId, ct);
            if (newSeat == null)
            {
                return BadRequest(new { message = "Ghế mới không thuộc xe của chuyến này hoặc không tồn tại!" });
            }

            long[] targetSeat = [newSeat.Id];

            var takenSeatIds = await seatHolds.GetTakenSeatIdsAsync(newTrip.Id, targetSeat, ct);
            if (takenSeatIds.Count > 0)
            {
                await transaction.RollbackAsync(ct);
                return Conflict(new { message = $"Ghế '{newSeat.SeatCode}' vừa bị người khác chọn! Vui lòng chọn ghế khác." });
            }

            await seatHolds.ReleaseStaleHoldsAsync(newTrip.Id, targetSeat, ct);

            var now = DateTime.UtcNow;

            // Vé cũ sang Exchanged: trạng thái này không nằm trong tập mà ActiveSeatKey coi là
            // đang chiếm, nên ghế cũ tự được nhả.
            ticket.Status = TicketStatus.Exchanged;

            var newTicket = new Ticket
            {
                BookingId = ticket.BookingId,
                TripId = newTrip.Id,
                SeatId = newSeat.Id,
                BoardStopId = ticket.BoardStopId,
                AlightStopId = ticket.AlightStopId,
                Status = TicketStatus.Held,
                QrCode = Guid.NewGuid().ToString("N")
            };
            db.Tickets.Add(newTicket);

            var changeRequest = new TicketChangeRequest
            {
                TicketId = ticket.Id,
                RequestType = ChangeRequestType.Exchange,
                NewTripId = newTrip.Id,
                NewSeatId = newSeat.Id,
                Status = ChangeRequestStatus.Approved,
                ProcessedAt = now,
                CreatedAt = now
            };
            db.TicketChangeRequests.Add(changeRequest);

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            await audit.WriteAsync(passengerId, GetActorName(), "EXCHANGE_TICKET", AuditActionType.Update,
                $"TICKET-{ticket.Id}", details: $"Đổi sang chuyến {newTrip.Id}, ghế {newSeat.SeatCode}", ct: ct);

            var localDeparture = newTrip.DepartureAt + VietnamOffset;

            return Ok(new ExchangeTicketResultDto
            {
                Message = "Đã đổi vé thành công!",
                OldTicketId = ticket.Id,
                NewTicketId = newTicket.Id,
                NewSeatCode = newSeat.SeatCode,
                NewTripId = newTrip.Id,
                NewDepartureDate = localDeparture.ToString("yyyy-MM-dd"),
                NewDepartureTime = localDeparture.ToString("HH:mm"),
                ChangeRequestId = changeRequest.Id,
                // Tổng tiền của lượt đặt giữ nguyên: thu thêm hay hoàn lại phần chênh đều cần
                // luồng thanh toán mà hệ thống chưa có. Trả về 0 thay vì một con số không ai thu.
                PriceDifference = 0m
            });
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            return Conflict(new { message = "Ghế vừa bị người khác đặt đồng thời! Vui lòng chọn lại ghế." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            return StatusCode(500, new { message = "Lỗi hệ thống khi đổi vé!", detail = ex.Message });
        }
    }
}
