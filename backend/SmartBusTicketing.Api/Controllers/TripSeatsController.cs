using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>Trả sơ đồ ghế của xe được gán cho chuyến và trạng thái đặt chỗ.</summary>
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
        var bookedSeatIds = await db.Tickets.AsNoTracking()
            .Where(ticket => ticket.TripId == tripId &&
                ((ticket.Status == TicketStatus.Valid || ticket.Status == TicketStatus.Used) &&
                    ticket.Booking.Status != BookingStatus.Cancelled &&
                    ticket.Booking.Status != BookingStatus.Expired ||
                 ticket.Status == TicketStatus.Held &&
                    (ticket.Booking.Status == BookingStatus.Confirmed ||
                     ticket.Booking.Status == BookingStatus.Pending && ticket.Booking.HoldExpiresAt > now)))
            .Select(ticket => ticket.SeatId)
            .Distinct()
            .ToListAsync(ct);

        var booked = bookedSeatIds.ToHashSet();
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
            var isAvailable = !booked.Contains(seat.Id);
            return new TripSeatDto
            {
                SeatId = seat.Id,
                SeatCode = seat.SeatCode,
                Row = seat.SeatRow,
                Column = seat.SeatCol,
                Status = isAvailable ? "Available" : "Booked",
                IsAvailable = isAvailable
            };
        }).ToList();

        return Ok(result);
    }
}
