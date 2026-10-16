using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Trả sơ đồ ghế của xe được gán cho chuyến kèm trạng thái từng ghế: còn trống, đang giữ chỗ (khách khác
/// đang thanh toán, sẽ tự nhả khi hết hạn) hay đã bán.
/// </summary>
[ApiController]
[Route("api/trips/{tripId:long}/seats")]
public sealed class TripSeatsController(AppDbContext db) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<TripSeatDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<TripSeatDto>>> Get(long tripId, CancellationToken ct)
    {
        var trip = await db.Trips.AsNoTracking()
            .Where(t => t.Id == tripId)
            .Select(t => new { t.Id, t.BusId })
            .SingleOrDefaultAsync(ct);

        if (trip is null)
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy chuyến xe." });

        // Chuyến chưa được gán xe vẫn hợp lệ, nhưng hiện chưa có ghế để hiển thị.
        if (trip.BusId is null)
            return Ok(Array.Empty<TripSeatDto>());

        var now = DateTime.UtcNow;

        // Ghế đã bán: vé còn hiệu lực hoặc đã quét, và lượt đặt đã trả tiền (Confirmed) — kể cả vé còn ở
        // trạng thái Held của một lượt đặt đã xác nhận.
        var soldSeatIds = await db.Tickets.AsNoTracking()
            .Where(ticket => ticket.TripId == tripId &&
                ((ticket.Status == TicketStatus.Valid || ticket.Status == TicketStatus.Used) &&
                    ticket.Booking.Status != BookingStatus.Cancelled &&
                    ticket.Booking.Status != BookingStatus.Expired ||
                 ticket.Status == TicketStatus.Held && ticket.Booking.Status == BookingStatus.Confirmed))
            .Select(ticket => ticket.SeatId)
            .Distinct()
            .ToListAsync(ct);

        // Ghế đang giữ: khách khác đang ở bước thanh toán và chưa hết 10 phút giữ chỗ. Ghế này cũng không
        // chọn được, nhưng sẽ tự nhả nếu lượt đặt kia hết hạn, nên hiển thị khác ghế đã bán.
        var heldSeatIds = await db.Tickets.AsNoTracking()
            .Where(ticket => ticket.TripId == tripId &&
                ticket.Status == TicketStatus.Held &&
                ticket.Booking.Status == BookingStatus.Pending &&
                ticket.Booking.HoldExpiresAt > now)
            .Select(ticket => ticket.SeatId)
            .Distinct()
            .ToListAsync(ct);

        var sold = soldSeatIds.ToHashSet();
        var held = heldSeatIds.Where(id => !sold.Contains(id)).ToHashSet();
        var seats = await db.Seats.AsNoTracking()
            .Where(seat => seat.BusId == trip.BusId)
            .OrderBy(seat => seat.SeatRow)
            .ThenBy(seat => seat.SeatCol)
            .ThenBy(seat => seat.SeatCode)
            .Select(seat => new
            {
                seat.Id,
                seat.SeatCode,
                seat.SeatRow,
                seat.SeatCol
            })
            .ToListAsync(ct);

        IReadOnlyList<TripSeatDto> result = seats.Select(seat =>
        {
            var isSold = sold.Contains(seat.Id);
            var isHeld = held.Contains(seat.Id);
            return new TripSeatDto
            {
                SeatId = seat.Id,
                SeatCode = seat.SeatCode,
                Row = seat.SeatRow,
                Column = seat.SeatCol,
                Status = isSold ? TripSeatDto.StatusSold : isHeld ? TripSeatDto.StatusHeld : TripSeatDto.StatusAvailable,
                IsAvailable = !isSold && !isHeld
            };
        }).ToList();

        return Ok(result);
    }
}
