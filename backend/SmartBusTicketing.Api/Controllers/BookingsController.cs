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

        var actorId = GetActorId();
        if (!actorId.HasValue)
        {
            return Unauthorized(new { message = "Không tìm thấy thông tin tài khoản người dùng hoặc token không hợp lệ!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId, ct);
            if (trip == null)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.TripId}!" });
            }

            // Chặn giữ chỗ trên chuyến đã hủy, đã kết thúc hoặc đã rời bến
            if (trip.Status == TripStatus.Cancelled)
            {
                return BadRequest(new { message = "Chuyến xe này đã bị hủy, không thể đặt vé!" });
            }
            if (trip.Status == TripStatus.Completed)
            {
                return BadRequest(new { message = "Chuyến xe này đã kết thúc, không thể đặt vé!" });
            }
            if (trip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe đã rời bến hoặc quá giờ khởi hành, không thể đặt vé!" });
            }

            // Xác thực điểm lên và điểm xuống: cùng thuộc tuyến của chuyến và điểm lên phải đứng trước điểm xuống
            var routeStops = await db.RouteStops
                .Where(rs => rs.RouteId == trip.RouteId && (rs.StopId == dto.BoardStopId || rs.StopId == dto.AlightStopId))
                .ToListAsync(ct);

            var boardStop = routeStops.FirstOrDefault(rs => rs.StopId == dto.BoardStopId);
            var alightStop = routeStops.FirstOrDefault(rs => rs.StopId == dto.AlightStopId);

            if (boardStop == null)
            {
                return BadRequest(new { message = "Điểm lên xe không thuộc lộ trình tuyến của chuyến xe này!" });
            }
            if (alightStop == null)
            {
                return BadRequest(new { message = "Điểm xuống xe không thuộc lộ trình tuyến của chuyến xe này!" });
            }
            if (boardStop.StopOrder >= alightStop.StopOrder)
            {
                return BadRequest(new { message = "Điểm lên xe phải đứng trước điểm xuống xe theo thứ tự trạm dừng!" });
            }

            var seats = await db.Seats
                .Where(s => s.BusId == trip.BusId && dto.SeatIds.Contains(s.Id))
                .ToListAsync(ct);

            if (seats.Count != dto.SeatIds.Count)
            {
                return BadRequest(new { message = "Một số ghế được chọn không thuộc xe của chuyến này hoặc không tồn tại!" });
            }

            // Kiểm tra ghế đã bị chọn
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

            // Tính FinalAmount thật theo đối tượng hành khách và vé lượt của tuyến (giống TripService)
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var approvedVerification = await db.PassengerVerifications
                .Include(pv => pv.PassengerType)
                .Where(pv => pv.AccountId == actorId.Value && pv.Status == VerificationStatus.Approved && (pv.ValidUntil == null || pv.ValidUntil >= today))
                .OrderByDescending(pv => pv.Id)
                .FirstOrDefaultAsync(ct);

            var passengerType = approvedVerification?.PassengerType;
            int passengerTypeId = passengerType?.Id ?? 1;

            var travelDate = DateOnly.FromDateTime(trip.DepartureAt);
            var routeFares = await db.Fares
                .Where(f => f.RouteId == trip.RouteId && f.TicketType == TicketType.Single && f.EffectiveFrom <= travelDate)
                .OrderByDescending(f => f.EffectiveFrom)
                .ToListAsync(ct);

            var standardFare = routeFares.FirstOrDefault(f => f.PassengerTypeId == 1)?.Price
                               ?? routeFares.FirstOrDefault()?.Price
                               ?? 7000m;

            var specificFare = routeFares.FirstOrDefault(f => f.PassengerTypeId == passengerTypeId);
            decimal unitPrice;
            if (specificFare != null)
            {
                unitPrice = specificFare.Price;
            }
            else if (passengerType != null && passengerType.DiscountPercent > 0)
            {
                unitPrice = Math.Round(standardFare * (100 - passengerType.DiscountPercent) / 100m, 0);
            }
            else
            {
                unitPrice = standardFare;
            }

            decimal finalAmount = unitPrice * seats.Count;

            // Mã booking 16 ký tự hex (tổng 19 ký tự, vừa vặn VARCHAR(20) và chống đụng độ)
            var booking = new Booking
            {
                BookingCode = "BK-" + Guid.NewGuid().ToString("N")[..16].ToUpper(),
                PassengerId = actorId.Value,
                TripId = dto.TripId,
                Status = BookingStatus.Pending,
                HoldExpiresAt = DateTime.UtcNow.AddMinutes(10),
                FinalAmount = finalAmount
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

            await audit.WriteAsync(actorId.Value, GetActorName(), "CONFIRM_BOOKING", AuditActionType.Create, $"TRIP-{dto.TripId}", ct: ct);

            return Ok(new
            {
                message = "Xác nhận đặt vé thành công!",
                bookingId = booking.Id,
                bookingCode = booking.BookingCode,
                tripId = dto.TripId,
                bookedSeats = seats.Select(s => s.SeatCode).ToList(),
                totalSeats = seats.Count,
                unitPrice,
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