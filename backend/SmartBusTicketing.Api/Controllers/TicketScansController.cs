using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Soát vé bằng mã QR trên xe.
///
/// Tài xế, phụ xe chỉ quét cho chuyến mình được phân công. Vé hợp lệ (Valid) được chuyển sang Used
/// bằng một câu UPDATE có điều kiện nên hai lần quét cùng lúc không thể cùng thành công. Mỗi lần quét,
/// kể cả bị từ chối, đều ghi vào ticket_scans để đối soát.
///
/// Vé còn ở trạng thái Held là vé chưa thanh toán nên bị từ chối. Hệ thống chưa có luồng thanh toán,
/// vì vậy vé chỉ quét được sau khi luồng đó chuyển vé sang Valid.
/// </summary>
[ApiController]
[Route("api/ticket-scans")]
[Authorize(Roles = "Admin,Manager,Driver,Conductor")]
public class TicketScansController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private bool IsManagement => User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);

    private async Task<bool> CanActOnTripAsync(long tripId, CancellationToken ct)
    {
        if (IsManagement) return true;
        var me = User.AccountId();
        return me is not null && await db.TripStaff.AnyAsync(s => s.TripId == tripId && s.AccountId == me, ct);
    }

    [HttpPost]
    public async Task<ActionResult<ScanTicketResponse>> Scan(ScanTicketRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();

        var trip = await db.Trips.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.TripId, ct);
        if (trip is null) return NotFound(new { message = $"Không tìm thấy chuyến #{request.TripId}." });
        if (!await CanActOnTripAsync(trip.Id, ct))
            return StatusCode(403, new { message = "Bạn không được phân công cho chuyến này nên không thể soát vé." });

        var code = request.QrCode.Trim();
        var ticket = await db.Tickets
            .Include(t => t.Booking).ThenInclude(b => b.Passenger)
            .Include(t => t.Seat)
            .Include(t => t.BoardStop)
            .Include(t => t.AlightStop)
            .FirstOrDefaultAsync(t => t.QrCode == code, ct);

        ScanResult result;
        string message;
        if (ticket is null)
        {
            result = ScanResult.Invalid;
            message = "Mã QR không tồn tại trong hệ thống.";
        }
        else if (ticket.TripId != trip.Id)
        {
            result = ScanResult.WrongTrip;
            message = $"Vé này thuộc chuyến #{ticket.TripId}, không phải chuyến #{trip.Id}.";
        }
        else if (ticket.Status == TicketStatus.Used)
        {
            result = ScanResult.AlreadyUsed;
            message = "Vé này đã được sử dụng.";
        }
        else if (ticket.Status == TicketStatus.Expired || trip.Status == TripStatus.Completed)
        {
            result = ScanResult.Expired;
            message = "Vé đã hết hạn.";
        }
        else if (ticket.Status is TicketStatus.Cancelled or TicketStatus.Exchanged)
        {
            result = ScanResult.Invalid;
            message = ticket.Status == TicketStatus.Cancelled ? "Vé đã bị hủy." : "Vé đã được đổi sang vé khác.";
        }
        else if (ticket.Status == TicketStatus.Held)
        {
            result = ScanResult.Invalid;
            message = "Vé chưa thanh toán.";
        }
        else if (trip.Status == TripStatus.Cancelled)
        {
            result = ScanResult.Invalid;
            message = "Chuyến xe đã bị hủy.";
        }
        else
        {
            // Chỉ một lần quét được chuyển Valid sang Used; lần quét đồng thời còn lại thấy 0 dòng bị đổi.
            var updated = await db.Tickets
                .Where(t => t.Id == ticket.Id && t.Status == TicketStatus.Valid)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.Status, TicketStatus.Used), ct);
            if (updated == 1)
            {
                result = ScanResult.Valid;
                message = "Vé hợp lệ. Mời hành khách lên xe.";
            }
            else
            {
                result = ScanResult.AlreadyUsed;
                message = "Vé này vừa được sử dụng.";
            }
        }

        db.TicketScans.Add(new TicketScan
        {
            TicketId = ticket?.Id,
            TripId = trip.Id,
            ScannedBy = actorId.Value,
            Result = result,
            ScannedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(actorId, User.Username() ?? "system", $"Quét vé chuyến #{trip.Id}: {result}",
            AuditActionType.View, ticket is null ? $"TRIP-{trip.Id}" : $"TICKET-{ticket.Id}",
            result == ScanResult.Valid ? AuditStatus.Success : AuditStatus.Warning, message, ct);

        return Ok(new ScanTicketResponse
        {
            Result = result.ToString(),
            Accepted = result == ScanResult.Valid,
            Message = message,
            Ticket = ticket is null
                ? null
                : new ScannedTicketInfo
                {
                    TicketId = ticket.Id,
                    BookingCode = ticket.Booking.BookingCode,
                    PassengerName = ticket.Booking.Passenger.FullName,
                    SeatCode = ticket.Seat.SeatCode,
                    BoardStop = ticket.BoardStop.Name,
                    AlightStop = ticket.AlightStop.Name,
                    TripId = ticket.TripId,
                },
        });
    }

    /// <summary>Lịch sử quét của một chuyến, mới nhất trước.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TicketScanDto>>> History([FromQuery] long tripId, [FromQuery] int take = 50, CancellationToken ct = default)
    {
        if (!await CanActOnTripAsync(tripId, ct))
            return StatusCode(403, new { message = "Bạn không được phân công cho chuyến này." });

        var list = await db.TicketScans.AsNoTracking()
            .Where(s => s.TripId == tripId)
            .OrderByDescending(s => s.ScannedAt).ThenByDescending(s => s.Id)
            .Take(Math.Clamp(take, 1, 200))
            .Select(s => new TicketScanDto
            {
                Id = s.Id,
                ScannedAt = s.ScannedAt,
                Result = s.Result.ToString(),
                SeatCode = s.Ticket != null ? s.Ticket.Seat.SeatCode : null,
                PassengerName = s.Ticket != null ? s.Ticket.Booking.Passenger.FullName : null,
                TripId = s.TripId,
            })
            .ToListAsync(ct);
        return Ok(list);
    }
}
