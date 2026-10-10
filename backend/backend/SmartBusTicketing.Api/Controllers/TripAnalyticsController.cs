using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

public sealed record TripOccupancyDto(
    long TripId, long RouteId, string RouteCode, string RouteName,
    DateTime DepartureAt, string Status, long? BusId, string? PlateNumber,
    int Capacity, int SeatsSold, int SeatsAvailable, decimal FillRatePercent);

[ApiController]
[Route("api/reports/occupancy")]
[Authorize(Roles = "Admin,Manager")]
public sealed class TripOccupancyController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly? date,
        [FromQuery] DateOnly? startDate,
        [FromQuery] DateOnly? endDate,
        [FromQuery] long? routeId,
        [FromQuery] TimeOnly? departureFrom,
        [FromQuery] TimeOnly? departureTo,
        CancellationToken ct)
    {
        if (date.HasValue && (startDate.HasValue || endDate.HasValue))
            return BadRequest(new { message = "Dùng date hoặc startDate/endDate, không dùng đồng thời." });
        if (startDate.HasValue && endDate.HasValue && startDate > endDate)
            return BadRequest(new { message = "startDate không được sau endDate." });
        if (departureFrom.HasValue && departureTo.HasValue && departureFrom > departureTo)
            return BadRequest(new { message = "departureFrom không được sau departureTo." });

        var trips = db.Trips.AsNoTracking().Include(t => t.BusRoute).Include(t => t.Bus).AsQueryable();
        if (routeId.HasValue) trips = trips.Where(t => t.RouteId == routeId.Value);
        if (date.HasValue)
        {
            var from = date.Value.ToDateTime(TimeOnly.MinValue);
            var to = date.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            trips = trips.Where(t => t.DepartureAt >= from && t.DepartureAt < to);
        }
        else
        {
            if (startDate.HasValue)
            {
                var from = startDate.Value.ToDateTime(TimeOnly.MinValue);
                trips = trips.Where(t => t.DepartureAt >= from);
            }
            if (endDate.HasValue)
            {
                var to = endDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
                trips = trips.Where(t => t.DepartureAt < to);
            }
        }
        if (departureFrom.HasValue)
        {
            var h = departureFrom.Value.Hour; var m = departureFrom.Value.Minute;
            trips = trips.Where(t => t.DepartureAt.Hour > h || (t.DepartureAt.Hour == h && t.DepartureAt.Minute >= m));
        }
        if (departureTo.HasValue)
        {
            var h = departureTo.Value.Hour; var m = departureTo.Value.Minute;
            trips = trips.Where(t => t.DepartureAt.Hour < h || (t.DepartureAt.Hour == h && t.DepartureAt.Minute <= m));
        }

        var data = await trips.OrderBy(t => t.DepartureAt).Select(t => new
        {
            t.Id, t.RouteId, RouteCode = t.BusRoute.Code, RouteName = t.BusRoute.Name,
            t.DepartureAt, t.Status, t.BusId, PlateNumber = t.Bus == null ? null : t.Bus.PlateNumber,
            Capacity = t.Bus == null ? 0 : (t.Bus.Capacity > 0 ? t.Bus.Capacity : t.Bus.Seats.Count),
            Sold = db.Tickets.Count(k => k.TripId == t.Id && (k.Status == TicketStatus.Valid || k.Status == TicketStatus.Used))
        }).ToListAsync(ct);

        var result = data.Select(t => new TripOccupancyDto(
            t.Id, t.RouteId, t.RouteCode, t.RouteName, t.DepartureAt, t.Status.ToString(), t.BusId,
            t.PlateNumber, t.Capacity, t.Sold, Math.Max(0, t.Capacity - t.Sold),
            t.Capacity <= 0 ? 0 : Math.Round((decimal)t.Sold * 100m / t.Capacity, 2))).ToList();
        return Ok(new { totalTrips = result.Count, trips = result });
    }
}

[ApiController]
[Route("api/trips/filter")]
[Authorize(Roles = "Admin,Manager")]
public sealed class TripFilterController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly? date,
        [FromQuery] int? month,
        [FromQuery] int? year,
        [FromQuery] long? routeId,
        [FromQuery] TimeOnly? timeFrom,
        [FromQuery] TimeOnly? timeTo,
        [FromQuery] TripStatus? status,
        CancellationToken ct)
    {
        if (month.HasValue && (month < 1 || month > 12)) return BadRequest(new { message = "month phải từ 1 đến 12." });
        if (year.HasValue && (year < 2000 || year > 2200)) return BadRequest(new { message = "year không hợp lệ." });
        if (date.HasValue && (month.HasValue || year.HasValue)) return BadRequest(new { message = "Không kết hợp date với month/year." });
        if (timeFrom.HasValue && timeTo.HasValue && timeFrom > timeTo) return BadRequest(new { message = "timeFrom không được sau timeTo." });

        var q = db.Trips.AsNoTracking().Include(t => t.BusRoute).Include(t => t.Bus).AsQueryable();
        if (routeId.HasValue) q = q.Where(t => t.RouteId == routeId.Value);
        if (status.HasValue) q = q.Where(t => t.Status == status.Value);
        if (date.HasValue)
        {
            var start = date.Value.ToDateTime(TimeOnly.MinValue); var end = date.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            q = q.Where(t => t.DepartureAt >= start && t.DepartureAt < end);
        }
        else
        {
            if (year.HasValue) q = q.Where(t => t.DepartureAt.Year == year.Value);
            if (month.HasValue) q = q.Where(t => t.DepartureAt.Month == month.Value);
        }
        if (timeFrom.HasValue)
        {
            var h = timeFrom.Value.Hour; var m = timeFrom.Value.Minute;
            q = q.Where(t => t.DepartureAt.Hour > h || (t.DepartureAt.Hour == h && t.DepartureAt.Minute >= m));
        }
        if (timeTo.HasValue)
        {
            var h = timeTo.Value.Hour; var m = timeTo.Value.Minute;
            q = q.Where(t => t.DepartureAt.Hour < h || (t.DepartureAt.Hour == h && t.DepartureAt.Minute <= m));
        }

        var rows = await q.OrderBy(t => t.DepartureAt).Select(t => new
        {
            t.Id, t.RouteId, RouteCode = t.BusRoute.Code, RouteName = t.BusRoute.Name,
            t.DepartureAt, Status = t.Status.ToString(), t.BusId,
            PlateNumber = t.Bus == null ? null : t.Bus.PlateNumber,
            Capacity = t.Bus == null ? 0 : (t.Bus.Capacity > 0 ? t.Bus.Capacity : t.Bus.Seats.Count)
        }).ToListAsync(ct);
        return Ok(new { total = rows.Count, trips = rows });
    }
}
