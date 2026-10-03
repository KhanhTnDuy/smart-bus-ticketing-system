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

        // 1. Mở Database Transaction để đảm bảo tính toàn vẹn dữ liệu
        using var transaction = await db.Database.BeginTransactionAsync(ct);

        try
        {
            // Kiểm tra sự tồn tại của chuyến xe
            var tripExists = await db.Trips.AnyAsync(t => t.Id == dto.TripId, ct);
            if (!tripExists)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.TripId}!" });
            }

            // 2. Tải danh sách các ghế được chọn (Dùng DbSet Seats trong AppDbContext)
            var seats = await db.Seats
                .Where(s => s.TripId == dto.TripId && dto.SeatIds.Contains(s.Id))
                .ToListAsync(ct);

            if (seats.Count != dto.SeatIds.Count)
            {
                return BadRequest(new { message = "Một số ghế được chọn không thuộc chuyến xe này hoặc không tồn tại!" });
            }

            // 3. Kiểm tra trạng thái từng ghế (Dùng enum SeatStatus)
            foreach (var seat in seats)
            {
                if (seat.Status != SeatStatus.Available)
                {
                    await transaction.RollbackAsync(ct);
                    return Conflict(new { message = $"Ghế '{seat.SeatNumber}' vừa bị người khác chọn! Vui lòng chọn ghế khác." });
                }

                // Cập nhật trạng thái ghế sang Đã đặt (Booked)
                seat.Status = SeatStatus.Booked;
                seat.UpdatedAt = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // 4. Ghi nhật ký hệ thống (Audit Log)
            await audit.WriteAsync(GetActorId(), GetActorName(), "CONFIRM_BOOKING", AuditActionType.Create, $"TRIP-{dto.TripId}", ct: ct);

            return Ok(new
            {
                message = "Xác nhận đặt vé thành công!",
                tripId = dto.TripId,
                bookedSeats = seats.Select(s => s.SeatNumber).ToList(),
                totalSeats = seats.Count,
                bookedAt = DateTime.UtcNow
            });
        }
        catch (DbUpdateException)
        {
            // Bắt lỗi trùng khóa duy nhất khi 2 người bấm đặt cùng một thời điểm
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
