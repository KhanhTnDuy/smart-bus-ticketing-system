using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Hành khách GỬI YÊU CẦU hủy hoặc đổi vé. Yêu cầu chưa có hiệu lực ngay: vé và ghế
/// không đổi gì cho tới khi Admin/Quản lý duyệt ở TicketChangeRequestsController.
///
/// Đúng theo user story trong product backlog: "Là hành khách, tôi muốn gửi yêu cầu hủy
/// hoặc đổi chuyến vé đã mua trước giờ chạy để linh hoạt kế hoạch." Bảng
/// ticket_change_requests cũng được thiết kế cho luồng này: có status
/// Pending/Approved/Rejected cùng processed_by và processed_at.
/// </summary>
[ApiController]
[Route("api/tickets")]
[Authorize]
public class TicketsController(AppDbContext db, AuditLogService audit, ITicketExchangeValidator exchangeValidator) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "Customer";

    /// <summary>Các trạng thái vé còn có thể xin hủy hoặc xin đổi.</summary>
    private static bool IsActionable(TicketStatus status) =>
        status is TicketStatus.Held or TicketStatus.Valid;

    private static string DescribeStatus(TicketStatus status) => status switch
    {
        TicketStatus.Used => "đã được sử dụng",
        TicketStatus.Cancelled => "đã bị hủy",
        TicketStatus.Exchanged => "đã được đổi sang vé khác",
        TicketStatus.Expired => "đã hết hạn giữ chỗ",
        _ => status.ToString()
    };

    /// <summary>
    /// Nạp vé của chính người đang đăng nhập, kèm kiểm tra các điều kiện chung của cả hai
    /// loại yêu cầu. Trả về lỗi dạng ActionResult nếu không đạt.
    /// </summary>
    private async Task<(Ticket? Ticket, IActionResult? Error)> LoadOwnTicketAsync(long id, long passengerId, string verb, CancellationToken ct)
    {
        var ticket = await db.Tickets
            .Include(t => t.Booking)
            .Include(t => t.Trip)
            .Include(t => t.Seat)
            .FirstOrDefaultAsync(t => t.Id == id, ct);

        // Trả 404 cả khi vé thuộc người khác: 403 sẽ tiết lộ rằng mã vé đó tồn tại.
        if (ticket == null || ticket.Booking.PassengerId != passengerId)
        {
            return (null, NotFound(new { message = $"Không tìm thấy vé có mã ID = {id}!" }));
        }

        if (!IsActionable(ticket.Status))
        {
            return (null, BadRequest(new { message = $"Vé {ticket.Seat.SeatCode} {DescribeStatus(ticket.Status)}, không thể {verb}!" }));
        }

        if (ticket.Trip.DepartureAt <= DateTime.UtcNow)
        {
            return (null, BadRequest(new { message = $"Chuyến xe đã khởi hành, không thể {verb}!" }));
        }

        // Một vé chỉ được có một yêu cầu đang chờ: nếu không, duyệt yêu cầu thứ hai sẽ thao
        // tác trên một vé mà yêu cầu thứ nhất vừa đổi trạng thái.
        var pending = await db.TicketChangeRequests
            .AnyAsync(r => r.TicketId == ticket.Id && r.Status == ChangeRequestStatus.Pending, ct);

        if (pending)
        {
            return (null, Conflict(new { message = $"Vé {ticket.Seat.SeatCode} đã có một yêu cầu đang chờ duyệt!" }));
        }

        return (ticket, null);
    }

    /// <summary>Gửi yêu cầu hủy vé. Ghế chỉ được nhả sau khi quản lý duyệt.</summary>
    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> RequestCancel(long id, [FromBody] CancelTicketDto dto, CancellationToken ct)
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

        var (ticket, error) = await LoadOwnTicketAsync(id, passengerId.Value, "hủy", ct);
        if (error != null) return error;

        var request = new TicketChangeRequest
        {
            TicketId = ticket!.Id,
            RequestType = ChangeRequestType.Cancel,
            Reason = dto.Reason.Trim(),
            Status = ChangeRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        db.TicketChangeRequests.Add(request);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(passengerId, GetActorName(), "REQUEST_CANCEL_TICKET", AuditActionType.Create,
            $"TICKET-{ticket.Id}", details: dto.Reason.Trim(), ct: ct);

        return Ok(new ChangeRequestCreatedDto
        {
            Message = "Đã gửi yêu cầu hủy vé. Vé vẫn còn hiệu lực tới khi quản lý duyệt.",
            ChangeRequestId = request.Id,
            TicketId = ticket.Id,
            SeatCode = ticket.Seat.SeatCode,
            RequestType = request.RequestType.ToString(),
            Status = request.Status.ToString()
        });
    }

    /// <summary>
    /// Gửi yêu cầu đổi vé sang chuyến và ghế khác. Ghế mới KHÔNG được giữ lúc này: hệ
    /// thống kiểm lại lúc duyệt, và nếu ghế đã có người thì yêu cầu bị từ chối kèm lý do.
    /// </summary>
    [HttpPost("{id:long}/exchange")]
    public async Task<IActionResult> RequestExchange(long id, [FromBody] ExchangeTicketDto dto, CancellationToken ct)
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

        var (ticket, error) = await LoadOwnTicketAsync(id, passengerId.Value, "đổi", ct);
        if (error != null) return error;

        if (dto.NewTripId == ticket!.TripId && dto.NewSeatId == ticket.SeatId)
        {
            return BadRequest(new { message = "Chuyến và ghế mới trùng với vé hiện tại!" });
        }

        var newTrip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.NewTripId, ct);
        if (newTrip == null)
        {
            return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.NewTripId}!" });
        }

        var validation = await exchangeValidator.ValidateAsync(ticket, newTrip, dto.NewSeatId, ct);
        if (!validation.IsValid)
        {
            return StatusCode(validation.StatusCode, new { message = validation.Message });
        }

        var request = new TicketChangeRequest
        {
            TicketId = ticket.Id,
            RequestType = ChangeRequestType.Exchange,
            NewTripId = newTrip.Id,
            NewSeatId = validation.Seat!.Id,
            Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim(),
            Status = ChangeRequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        db.TicketChangeRequests.Add(request);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(passengerId, GetActorName(), "REQUEST_EXCHANGE_TICKET", AuditActionType.Create,
            $"TICKET-{ticket.Id}", details: $"Xin đổi sang chuyến {newTrip.Id}, ghế {validation.Seat.SeatCode}", ct: ct);

        return Ok(new ChangeRequestCreatedDto
        {
            Message = "Đã gửi yêu cầu đổi vé. Ghế mới chưa được giữ, quản lý sẽ kiểm tra khi duyệt.",
            ChangeRequestId = request.Id,
            TicketId = ticket.Id,
            SeatCode = ticket.Seat.SeatCode,
            RequestType = request.RequestType.ToString(),
            Status = request.Status.ToString()
        });
    }
}
