using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/reports/occupancy")]
[Authorize(Roles = "Admin,Manager")]
public class OccupancyReportsController(AppDbContext db) : ControllerBase
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] DateOnly? date,
        [FromQuery] long? routeId,
        CancellationToken ct)
    {
        if (routeId.HasValue && !await db.BusRoutes.AsNoTracking().AnyAsync(x => x.Id == routeId.Value, ct))
            return BadRequest(new { message = "Tuyến xe không tồn tại." });

        var query = db.Trips.AsNoTracking().AsQueryable();
        if (date.HasValue)
        {
            var fromUtc = date.Value.ToDateTime(TimeOnly.MinValue) - VietnamOffset;
            var toUtc = date.Value.AddDays(1).ToDateTime(TimeOnly.MinValue) - VietnamOffset;
            query = query.Where(t => t.DepartureAt >= fromUtc && t.DepartureAt < toUtc);
        }
        if (routeId.HasValue) query = query.Where(t => t.RouteId == routeId.Value);

        var rows = await query.OrderBy(t => t.DepartureAt)
            .Select(t => new
            {
                TripId = t.Id,
                RouteId = t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                BusPlate = t.Bus == null ? null : t.Bus.PlateNumber,
                BusCapacity = t.Bus == null ? 0 : t.Bus.Capacity,
                SeatCount = t.Bus == null ? 0 : t.Bus.Seats.Count(),
                DepartureAt = t.DepartureAt,
                TripStatus = t.Status.ToString(),
                DriverName = t.TripStaff.Where(s => s.Duty == StaffDuty.Driver)
                    .Select(s => s.Account.FullName).FirstOrDefault(),
                BookedSeatsCount = t.Bookings
                    .Where(b => b.Status == BookingStatus.Confirmed)
                    .SelectMany(b => b.Tickets)
                    .Count(ticket => ticket.Status == TicketStatus.Valid || ticket.Status == TicketStatus.Used)
            })
            .ToListAsync(ct);

        var result = rows.Select(x =>
        {
            var capacity = x.BusCapacity > 0 ? x.BusCapacity : x.SeatCount;
            var percent = capacity > 0 ? (int)Math.Round(x.BookedSeatsCount * 100d / capacity) : 0;
            var loadStatus = capacity <= 0 ? "NO_BUS" : x.BookedSeatsCount == 0 ? "NO_TICKETS" :
                percent >= 85 ? "OVERLOAD" : percent >= 60 ? "OPTIMAL" : "LOW";
            var recommendation = loadStatus switch
            {
                "NO_BUS" => "Chưa bố trí phương tiện. Cần gán xe trước giờ xuất bến.",
                "NO_TICKETS" => "Chưa có vé hợp lệ. Có thể xem xét điều chỉnh lịch hoặc chương trình khuyến mại.",
                "OVERLOAD" => "Tỷ lệ lấp đầy cao. Cân nhắc tăng tần suất hoặc bố trí xe có sức chứa lớn hơn.",
                "OPTIMAL" => "Tỷ lệ lấp đầy phù hợp. Tiếp tục theo dõi nhu cầu trên tuyến.",
                _ => "Tỷ lệ lấp đầy thấp. Cân nhắc điều chỉnh phương tiện hoặc lịch chạy."
            };
            return new
            {
                tripId = x.TripId.ToString(),
                routeId = x.RouteId.ToString(),
                routeCode = x.RouteCode,
                routeName = x.RouteName,
                busPlate = x.BusPlate,
                busModel = capacity > 0 ? $"{capacity} chỗ" : "Chưa rõ",
                driverName = x.DriverName ?? "Chưa gán",
                departureTime = x.DepartureAt.ToString("HH:mm"),
                departureDate = DateOnly.FromDateTime(x.DepartureAt.Add(VietnamOffset)).ToString("yyyy-MM-dd"),
                totalSeats = capacity,
                bookedSeatsCount = x.BookedSeatsCount,
                occupancyPercent = percent,
                loadStatus,
                recommendation,
                tripStatus = x.TripStatus
            };
        });

        return Ok(result);
    }
}
