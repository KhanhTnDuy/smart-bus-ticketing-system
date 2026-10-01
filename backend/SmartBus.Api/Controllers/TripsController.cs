using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;
using SmartBus.Api.DTOs;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/trips")]
public class TripsController : ControllerBase
{
    private readonly SmartBusDbContext _db;

    public TripsController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? date)
    {
        var query = _db.Trips.AsNoTracking().AsQueryable();

        if (date.HasValue)
        {
            var start = date.Value.Date;
            var end = start.AddDays(1);
            query = query.Where(x => x.DepartureTime >= start && x.DepartureTime < end);
        }

        var trips = await query.OrderBy(x => x.DepartureTime).ToListAsync();
        await FillAvailableSeats(trips);

        return Ok(trips);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null) return NotFound();

        trip.AvailableSeats = await GetAvailableSeats(id);
        return Ok(trip);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery(Name = "from")] string? from,
        [FromQuery(Name = "to")] string? to,
        [FromQuery] DateTime? date,
        [FromQuery] TimeSpan? time)
    {
        if (!date.HasValue)
            return BadRequest(new { message = "date là bắt buộc." });

        var start = date.Value.Date;
        var end = start.AddDays(1);

        var query = _db.Trips.AsNoTracking()
            .Where(x => x.DepartureTime >= start && x.DepartureTime < end);

        if (!string.IsNullOrWhiteSpace(from))
            query = query.Where(x => x.StartPoint.ToLower().Contains(from.Trim().ToLower()));

        if (!string.IsNullOrWhiteSpace(to))
            query = query.Where(x => x.EndPoint.ToLower().Contains(to.Trim().ToLower()));

        if (time.HasValue)
            query = query.Where(x => x.DepartureTime.TimeOfDay >= time.Value);

        var trips = await query.OrderBy(x => x.DepartureTime).ToListAsync();
        await FillAvailableSeats(trips);

        return Ok(new
        {
            count = trips.Count,
            items = trips
        });
    }

    private async Task FillAvailableSeats(List<Models.Trip> trips)
    {
        foreach (var trip in trips)
            trip.AvailableSeats = await GetAvailableSeats(trip.Id);
    }

    private async Task<int> GetAvailableSeats(int tripId)
    {
        var assignment = await _db.TripAssignments
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.TripId == tripId);

        if (assignment is null)
            return 0;

        var bus = await _db.Buses.AsNoTracking().FirstAsync(x => x.Id == assignment.BusId);
        var total = bus.SeatRows * bus.SeatColumns;
        var used = await _db.SeatReservations.CountAsync(x =>
            x.TripId == tripId && x.Status == "SELECTED");

        return Math.Max(0, total - used);
    }
}
