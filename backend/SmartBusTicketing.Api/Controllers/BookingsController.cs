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

        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId, ct);
            if (trip == null)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.TripId}!" });
            }

            // SCRUM-62 - kiểm tra lại ở máy chủ: điểm lên và điểm xuống phải nằm trên tuyến
            // của chuyến, và điểm lên phải đứng trước điểm xuống. Đây là cùng ràng buộc mà
            // API tìm chuyến (SCRUM-54) đã áp lúc tra cứu; client có thể bỏ qua nên phải
            // kiểm lại, nếu không vé sẽ ghi một hành trình không tồn tại.
            if (dto.BoardStopId == dto.AlightStopId)
            {
                return BadRequest(new { message = "Điểm lên xe và điểm xuống xe không được trùng nhau!" });
            }

            var stopOrders = await db.RouteStops
                .Where(rs => rs.RouteId == trip.RouteId &&
                             (rs.StopId == dto.BoardStopId || rs.StopId == dto.AlightStopId))
                .Select(rs => new { rs.StopId, rs.StopOrder })
                .ToListAsync(ct);

            var boardOrder = stopOrders.FirstOrDefault(x => x.StopId == dto.BoardStopId)?.StopOrder;
            var alightOrder = stopOrders.FirstOrDefault(x => x.StopId == dto.AlightStopId)?.StopOrder;

            if (boardOrder is null || alightOrder is null)
            {
                return BadRequest(new { message = "Điểm lên xe hoặc điểm xuống xe không thuộc tuyến của chuyến này!" });
            }

            if (boardOrder >= alightOrder)
            {
                return BadRequest(new { message = "Điểm lên xe phải đứng trước điểm xuống xe trên tuyến!" });
            }

            var seats = await db.Seats
                .Where(s => s.BusId == trip.BusId && dto.SeatIds.Contains(s.Id))
                .ToListAsync(ct);

            if (seats.Count != dto.SeatIds.Count)
            {
                return BadRequest(new { message = "Một số ghế được chọn không thuộc xe của chuyến này hoặc không tồn tại!" });
            }

            // Sửa dấu || thành && để giải phóng ghế khi hết hạn
            var takenSeatIds = await db.Tickets
                .Where(t => t.TripId == dto.TripId && dto.SeatIds.Contains(t.SeatId))
                .Where(t => t.Status == TicketStatus.Valid ||
                            t.Status == TicketStatus.Used ||
                            (t.Status == TicketStatus.Held && t.Booking != null &&
                             t.Booking.Status == BookingStatus.Pending && t.Booking.HoldExpiresAt > DateTime.UtcNow))
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

            // Bổ sung đầy đủ BookingCode, PassengerId, TripId, FinalAmount
            var booking = new Booking
            {
                // 16 ký tự thay vì 8: booking_code có unique index, mà mọi DbUpdateException ở
                // đây đều bị quy về "ghế vừa bị người khác chọn". Mã càng ngắn thì càng dễ trùng
                // và càng dễ báo sai nguyên nhân. 19 ký tự vẫn vừa cột VARCHAR(20).
                BookingCode = "BK-" + Guid.NewGuid().ToString("N")[..16].ToUpper(),
                PassengerId = passengerId.Value,
                TripId = dto.TripId,
                Status = BookingStatus.Pending,
                HoldExpiresAt = DateTime.UtcNow.AddMinutes(10),
                FinalAmount = 0
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
                bookingCode = booking.BookingCode,
                tripId = dto.TripId,
                bookedSeats = seats.Select(s => s.SeatCode).ToList(),
                totalSeats = seats.Count,
                finalAmount = booking.FinalAmount,
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
