using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;
using SmartBus.Api.DTOs;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/trips/{tripId:int}/seats")]
public class SeatsController : ControllerBase
{
    private readonly SmartBusDbContext _db;

    public SeatsController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetSeats(int tripId)
    {
        var trip = await _db.Trips.FindAsync(tripId);
        if (trip is null) return NotFound(new { message = "Không tìm thấy chuyến." });

        var assignment = await _db.TripAssignments.FirstOrDefaultAsync(x => x.TripId == tripId);
        if (assignment is null)
            return BadRequest(new { message = "Chuyến chưa được gán xe nên chưa có sơ đồ ghế." });

        var seats = await _db.BusSeats
            .Where(x => x.BusId == assignment.BusId)
            .OrderBy(x => x.SeatNumber)
            .ToListAsync();

        var selected = await _db.SeatReservations
            .Where(x => x.TripId == tripId && x.Status == "SELECTED")
            .Select(x => x.SeatNumber)
            .ToHashSetAsync();

        return Ok(seats.Select(x => new
        {
            x.SeatNumber,
            status = selected.Contains(x.SeatNumber) ? "OCCUPIED" : "AVAILABLE"
        }));
    }

    [HttpPost("{seatNumber}/select")]
    public async Task<IActionResult> SelectSeat(
        int tripId,
        string seatNumber,
        SeatSelectionRequest request)
    {
        var trip = await _db.Trips.FindAsync(tripId);
        if (trip is null) return NotFound();

        var assignment = await _db.TripAssignments.FirstOrDefaultAsync(x => x.TripId == tripId);
        if (assignment is null)
            return BadRequest(new { message = "Chuyến chưa được gán xe." });

        var exists = await _db.BusSeats.AnyAsync(x =>
            x.BusId == assignment.BusId && x.SeatNumber == seatNumber);

        if (!exists)
            return BadRequest(new { message = "Ghế không tồn tại." });

        var occupied = await _db.SeatReservations.AnyAsync(x =>
            x.TripId == tripId &&
            x.SeatNumber == seatNumber &&
            x.Status == "SELECTED");

        if (occupied)
            return Conflict(new { message = "Ghế vừa được người khác chọn." });

        var reservation = new Models.SeatReservation
        {
            TripId = tripId,
            SeatNumber = seatNumber.ToUpperInvariant(),
            PassengerName = request.PassengerName.Trim(),
            Status = "SELECTED"
        };

        _db.SeatReservations.Add(reservation);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Chọn ghế thành công.",
            tripId,
            seatNumber = reservation.SeatNumber,
            status = reservation.Status
        });
    }

    [HttpDelete("{seatNumber}/select")]
    public async Task<IActionResult> UnselectSeat(int tripId, string seatNumber)
    {
        var reservation = await _db.SeatReservations.FirstOrDefaultAsync(x =>
            x.TripId == tripId &&
            x.SeatNumber == seatNumber.ToUpperInvariant() &&
            x.Status == "SELECTED");

        if (reservation is null) return NotFound(new { message = "Ghế chưa được chọn." });

        _db.SeatReservations.Remove(reservation);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
