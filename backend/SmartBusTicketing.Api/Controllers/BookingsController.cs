using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "Customer";

    [HttpPost]
    public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId, ct);
            if (trip == null)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.TripId}!" });
            }

            var seats = await db.Seats
                .Where(s => s.BusId == trip.BusId && dto.SeatIds.Contains(s.Id))
                .ToListAsync(ct);

            if (seats.Count != dto.SeatIds.Count)
            {
                return BadRequest(new { message = "Một số ghế được chọn không thuộc xe của chuyến này hoặc không tồn tại!" });
            }

            var takenSeatIds = await db.Tickets
                .Where(t => t.TripId == dto.TripId && dto.SeatIds.Contains(t.SeatId))
                .Where(t => t.Status == TicketStatus.Valid ||
                            t.Status == TicketStatus.Used ||
                            (t.Status == TicketStatus.Held && t.Booking != null &&
                             (t.Booking.Status == BookingStatus.Pending || t.Booking.HoldExpiresAt > DateTime.UtcNow)))
                .Select(t => t.SeatId)
                .Distinct()
                .ToListAsync(ct);

            if (takenSeatIds.Any())
            {
                var takenSeatCodes = seats
                    .Where(s => takenSeatIds.Contains(s.Id))
                    .Select(s => s.SeatCode)
                    .ToList();

                await transaction.RollbackAsync(ct);
                return Conflict(new { message = $"Ghế '{string.Join(", ", takenSeatCodes)}' vừa bị người khác chọn! Vui lòng chọn ghế khác." });
            }

            var booking = new Booking
            {
                Status = BookingStatus.Pending,
                HoldExpiresAt = DateTime.UtcNow.AddMinutes(10)
            };

            db.Bookings.Add(booking);
            await db.SaveChangesAsync(ct);

            foreach (var seat in seats)
            {
                var ticket = new Ticket
                {
                    BookingId = booking.Id,
                    TripId = dto.TripId,
                    SeatId = seat.Id,
                    BoardStopId = dto.BoardStopId,
                    AlightStopId = dto.AlightStopId,
                    Status = TicketStatus.Held,
                    QrCode = Guid.NewGuid().ToString("N")
                };

                db.Tickets.Add(ticket);
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            await audit.WriteAsync(GetActorId(), GetActorName(), "CONFIRM_BOOKING", AuditActionType.Create, $"TRIP-{dto.TripId}", ct: ct);

            return Ok(new
            {
                message = "Xác nhận đặt vé thành công!",
                bookingId = booking.Id,
                tripId = dto.TripId,
                bookedSeats = seats.Select(s => s.SeatCode).ToList(),
                totalSeats = seats.Count,
                holdExpiresAt = booking.HoldExpiresAt
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
            return StatusCode(500, new { message = "Lỗi hệ thống khi xác nhận đặt vé!", detail = ex.Message });
        }
    }
}