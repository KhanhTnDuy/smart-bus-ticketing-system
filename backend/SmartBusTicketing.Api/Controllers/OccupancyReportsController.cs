using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

public sealed class TripOccupancyDto
{
    public long TripId { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string? BusPlate { get; init; }
    public string? DriverName { get; init; }
    /// <summary>Giờ UTC; giao diện đổi sang giờ địa phương.</summary>
    public DateTime DepartureAt { get; init; }
    public string TripStatus { get; init; } = string.Empty;
    public int TotalSeats { get; init; }
    public int OccupiedSeats { get; init; }
    public int OccupancyPercent { get; init; }
    /// <summary>OVERLOAD (từ 85%), OPTIMAL (60-84%), LOW (dưới 60%), NO_TICKETS (chưa có vé), NO_BUS (chưa gán xe).</summary>
    public string LoadStatus { get; init; } = string.Empty;
    public string Recommendation { get; init; } = string.Empty;
}

public sealed class OccupancySummaryDto
{
    public int TotalTrips { get; init; }
    public int TotalSeats { get; init; }
    public int OccupiedSeats { get; init; }
    public int AverageOccupancyPercent { get; init; }
    public int Overload { get; init; }
    public int Optimal { get; init; }
    public int Low { get; init; }
    public int NoTickets { get; init; }
    public int NoBus { get; init; }
}

public sealed class OccupancyReportDto
{
    public OccupancySummaryDto Summary { get; init; } = new();
    public IReadOnlyList<TripOccupancyDto> Trips { get; init; } = [];
}

/// <summary>
/// Thống kê tỷ lệ lấp đầy theo chuyến (SCRUM-76..80).
///
/// Ghế đã chiếm là ghế của vé Valid hoặc Used và vé Held trong lượt đặt đang giữ chỗ còn hạn (cùng quy tắc
/// với sơ đồ ghế, nên con số khớp với những gì hành khách thấy lúc đặt). Chuyến đã hủy không tính. Các chuyến
/// ngoại lệ (chưa gán xe, chưa có vé) được tách thành nhóm riêng thay vì làm lệch tỷ lệ trung bình.
/// </summary>
[ApiController]
[Route("api/reports/occupancy")]
[Authorize(Roles = "Admin,Manager")]
public class OccupancyReportsController(AppDbContext db) : ControllerBase
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static (string Status, int Percent, string Recommendation) Classify(bool hasBus, int capacity, int occupied)
    {
        if (!hasBus || capacity <= 0)
            return ("NO_BUS", 0, "Chưa bố trí phương tiện. Cần gán xe và tài xế trước giờ xuất bến.");
        if (occupied <= 0)
            return ("NO_TICKETS", 0, "Chưa có hành khách đặt chỗ. Xem xét gộp chuyến hoặc đẩy khuyến mại cho tuyến.");

        var percent = (int)Math.Round(occupied * 100.0 / capacity, MidpointRounding.AwayFromZero);
        if (percent >= 85) return ("OVERLOAD", percent, "Tỷ lệ lấp đầy rất cao (từ 85%). Đề xuất tăng tần suất chuyến hoặc dùng xe nhiều chỗ hơn.");
        if (percent >= 60) return ("OPTIMAL", percent, "Tỷ lệ lấp đầy hợp lý (60-84%). Giữ nguyên quy mô phương tiện và lịch chạy.");
        return ("LOW", percent, "Tỷ lệ lấp đầy thấp (dưới 60%). Đề xuất dùng xe ít chỗ hơn hoặc giảm tần suất để tiết kiệm nhiên liệu.");
    }

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? startDate, [FromQuery] string? endDate, [FromQuery] long? routeId, [FromQuery] string? status,
        CancellationToken ct)
    {
        DateTime? fromUtc = null, toUtc = null;
        if (!string.IsNullOrWhiteSpace(startDate))
        {
            if (!DateOnly.TryParse(startDate, out var s)) return BadRequest(new { message = "startDate không hợp lệ (yyyy-MM-dd)." });
            fromUtc = s.ToDateTime(TimeOnly.MinValue) - VietnamOffset;
        }
        if (!string.IsNullOrWhiteSpace(endDate))
        {
            if (!DateOnly.TryParse(endDate, out var e)) return BadRequest(new { message = "endDate không hợp lệ (yyyy-MM-dd)." });
            toUtc = e.AddDays(1).ToDateTime(TimeOnly.MinValue) - VietnamOffset;
        }
        if (fromUtc is { } f && toUtc is { } t && t <= f)
            return BadRequest(new { message = "endDate phải sau hoặc bằng startDate." });

        var trips = await db.Trips.AsNoTracking()
            .Where(x => x.Status != TripStatus.Cancelled
                && (fromUtc == null || x.DepartureAt >= fromUtc)
                && (toUtc == null || x.DepartureAt < toUtc)
                && (routeId == null || x.RouteId == routeId))
            .OrderBy(x => x.DepartureAt)
            .Select(x => new
            {
                x.Id,
                x.RouteId,
                RouteCode = x.BusRoute.Code,
                RouteName = x.BusRoute.Name,
                Plate = x.Bus != null ? x.Bus.PlateNumber : null,
                Capacity = x.Bus != null ? x.Bus.Capacity : 0,
                Driver = x.TripStaff.Where(s => s.Duty == StaffDuty.Driver).Select(s => s.Account.FullName).FirstOrDefault(),
                x.DepartureAt,
                x.Status,
            })
            .ToListAsync(ct);

        var ids = trips.Select(x => x.Id).ToList();
        var now = DateTime.UtcNow;
        var occupiedByTrip = (await db.Tickets.AsNoTracking()
                .Where(tk => ids.Contains(tk.TripId) &&
                    (tk.Status == TicketStatus.Valid || tk.Status == TicketStatus.Used ||
                     (tk.Status == TicketStatus.Held && tk.Booking.Status == BookingStatus.Pending && tk.Booking.HoldExpiresAt > now)))
                .GroupBy(tk => tk.TripId)
                .Select(g => new { TripId = g.Key, Count = g.Count() })
                .ToListAsync(ct))
            .ToDictionary(x => x.TripId, x => x.Count);

        var rows = trips.Select(x =>
        {
            var occupied = occupiedByTrip.GetValueOrDefault(x.Id);
            var (st, percent, rec) = Classify(x.Plate != null, x.Capacity, occupied);
            return new TripOccupancyDto
            {
                TripId = x.Id,
                RouteId = x.RouteId,
                RouteCode = x.RouteCode,
                RouteName = x.RouteName,
                BusPlate = x.Plate,
                DriverName = x.Driver,
                DepartureAt = x.DepartureAt,
                TripStatus = x.Status.ToString(),
                TotalSeats = x.Capacity,
                OccupiedSeats = occupied,
                OccupancyPercent = percent,
                LoadStatus = st,
                Recommendation = rec,
            };
        }).ToList();

        if (!string.IsNullOrWhiteSpace(status))
            rows = rows.Where(r => string.Equals(r.LoadStatus, status, StringComparison.OrdinalIgnoreCase)).ToList();

        // Trung bình tính trên các chuyến đã có xe: chuyến chưa gán xe không có sức chứa nên không được tính vào mẫu số.
        var withBus = rows.Where(r => r.LoadStatus != "NO_BUS").ToList();
        var seats = withBus.Sum(r => r.TotalSeats);
        var occ = withBus.Sum(r => r.OccupiedSeats);

        return Ok(new OccupancyReportDto
        {
            Summary = new OccupancySummaryDto
            {
                TotalTrips = rows.Count,
                TotalSeats = seats,
                OccupiedSeats = occ,
                AverageOccupancyPercent = seats == 0 ? 0 : (int)Math.Round(occ * 100.0 / seats, MidpointRounding.AwayFromZero),
                Overload = rows.Count(r => r.LoadStatus == "OVERLOAD"),
                Optimal = rows.Count(r => r.LoadStatus == "OPTIMAL"),
                Low = rows.Count(r => r.LoadStatus == "LOW"),
                NoTickets = rows.Count(r => r.LoadStatus == "NO_TICKETS"),
                NoBus = rows.Count(r => r.LoadStatus == "NO_BUS"),
            },
            Trips = rows,
        });
    }
}
