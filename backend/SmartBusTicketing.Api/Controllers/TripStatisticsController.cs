using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>Thống kê tình trạng ghế theo từng chuyến, phục vụ Admin và Quản lý.</summary>
[ApiController]
[Route("api/statistics/trips")]
[Authorize(Roles = "Admin,Manager")]
public sealed class TripStatisticsController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Occupancy tính trên ghế có vé đang giữ còn hạn, vé hợp lệ hoặc vé đã sử dụng.
    /// Chuyến không có vé trả 0%; chuyến chưa gán xe trả capacity 0 và occupancy null.
    /// Bộ lọc thời gian là UTC, khoảng [fromUtc, toUtc); không có kết quả trả trang rỗng.
    /// </summary>
    [HttpGet("occupancy")]
    public async Task<ActionResult<PagedResponse<TripOccupancyDto>>> GetOccupancy(
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] long? routeId,
        [FromQuery] TripStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (fromUtc.HasValue && toUtc.HasValue && fromUtc >= toUtc)
            return BadRequest(new ProblemDetails { Status = 400, Title = "fromUtc phải nhỏ hơn toUtc." });

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var now = DateTime.UtcNow;
        var trips = db.Trips.AsNoTracking().AsQueryable();
        if (fromUtc.HasValue) trips = trips.Where(t => t.DepartureAt >= fromUtc.Value);
        if (toUtc.HasValue) trips = trips.Where(t => t.DepartureAt < toUtc.Value);
        if (routeId.HasValue) trips = trips.Where(t => t.RouteId == routeId.Value);
        if (status.HasValue) trips = trips.Where(t => t.Status == status.Value);

        var total = await trips.CountAsync(ct);
        var data = await trips.OrderBy(t => t.DepartureAt).ThenBy(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TripOccupancyDto
            {
                TripId = t.Id,
                RouteId = t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                DepartureAt = t.DepartureAt,
                Status = t.Status,
                BusId = t.BusId,
                BusPlate = t.Bus == null ? null : t.Bus.PlateNumber,
                TotalSeats = t.Bus == null ? 0 : t.Bus.Capacity,
                BookedSeats = t.Bookings.SelectMany(booking => booking.Tickets)
                    .Where(ticket => ticket.Status == TicketStatus.Valid || ticket.Status == TicketStatus.Used ||
                        (ticket.Status == TicketStatus.Held && ticket.Booking.HoldExpiresAt > now))
                    .Select(ticket => ticket.SeatId)
                    .Distinct()
                    .Count(),
                OccupancyPercent = t.Bus == null || t.Bus.Capacity <= 0
                    ? null
                    : Math.Round(100m * t.Bookings.SelectMany(booking => booking.Tickets)
                        .Where(ticket => ticket.Status == TicketStatus.Valid || ticket.Status == TicketStatus.Used ||
                            (ticket.Status == TicketStatus.Held && ticket.Booking.HoldExpiresAt > now))
                        .Select(ticket => ticket.SeatId)
                        .Distinct()
                        .Count() / t.Bus.Capacity, 2)
            })
            .ToListAsync(ct);

        return Ok(new PagedResponse<TripOccupancyDto>
        {
            Data = data,
            Page = page,
            PageSize = pageSize,
            Total = total
        });
    }
}
