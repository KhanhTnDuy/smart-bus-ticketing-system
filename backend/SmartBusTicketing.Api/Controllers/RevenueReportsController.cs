using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Báo cáo doanh thu bán vé theo ngày, tháng và tuyến (SCRUM-82).
///
/// Doanh thu chỉ tính trên lượt đặt đã thanh toán (Confirmed, hoặc đã hủy nhưng từng có giao dịch
/// thành công). Lượt đang giữ chỗ chưa thanh toán không được tính. Cách đối chiếu với số vé đã bán
/// và loại trừ vé hủy/hoàn nằm trong <see cref="RevenueReportCalculator"/> (SCRUM-86).
/// </summary>
[ApiController]
[Route("api/reports/revenue")]
[Authorize(Roles = "Admin,Manager")]
public class RevenueReportsController(AppDbContext db) : ControllerBase
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] string? routeId,
        [FromQuery] string? groupBy,
        CancellationToken ct)
    {
        DateOnly? start = null, end = null;
        if (!string.IsNullOrWhiteSpace(startDate))
        {
            if (!DateOnly.TryParse(startDate, out var s)) return BadRequest(new { message = "startDate không hợp lệ (yyyy-MM-dd)." });
            start = s;
        }
        if (!string.IsNullOrWhiteSpace(endDate))
        {
            if (!DateOnly.TryParse(endDate, out var e)) return BadRequest(new { message = "endDate không hợp lệ (yyyy-MM-dd)." });
            end = e;
        }
        if (start is { } a && end is { } b && b < a)
            return BadRequest(new { message = "endDate phải sau hoặc bằng startDate." });

        // "ALL" hoặc rỗng nghĩa là mọi tuyến.
        long? route = long.TryParse(routeId, out var r) ? r : null;
        var monthly = string.Equals(groupBy, "MONTHLY", StringComparison.OrdinalIgnoreCase);

        // Lấy mọi vé của các lượt đặt đã thanh toán (không cắt theo ngày ở mức vé) vì tiền mỗi vé là
        // FinalAmount chia cho số vé của cả lượt; cắt trước sẽ chia sai. Ngày và tuyến lọc ở calculator.
        var paidBookings = db.Bookings.AsNoTracking().Where(bk =>
            bk.Status == BookingStatus.Confirmed ||
            (bk.Status == BookingStatus.Cancelled &&
             bk.Payments.Any(p => p.Status == PaymentStatus.Success || p.Status == PaymentStatus.Refunded)));

        var tickets = db.Tickets.AsNoTracking().Where(t => paidBookings.Any(bk => bk.Id == t.BookingId));

        // Thu hẹp theo khoảng ngày để khỏi nạp toàn bộ lịch sử: chỉ giữ các lượt đặt có ít nhất một vé trong kỳ.
        if (start is not null || end is not null)
        {
            DateTime? fromUtc = start is { } f ? f.ToDateTime(TimeOnly.MinValue) - VietnamOffset : null;
            DateTime? toUtc = end is { } g ? g.AddDays(1).ToDateTime(TimeOnly.MinValue) - VietnamOffset : null;
            var bookingIdsInRange = db.Tickets.AsNoTracking()
                .Where(t => (fromUtc == null || t.Trip.DepartureAt >= fromUtc) &&
                            (toUtc == null || t.Trip.DepartureAt < toUtc))
                .Select(t => t.BookingId);
            tickets = tickets.Where(t => bookingIdsInRange.Contains(t.BookingId));
        }

        var rows = await tickets
            .Select(t => new RevenueTicketRow(
                t.BookingId,
                t.Booking.FinalAmount,
                t.Status,
                t.Trip.DepartureAt,
                t.Trip.RouteId,
                t.Trip.BusRoute.Code,
                t.Trip.BusRoute.Name))
            .ToListAsync(ct);

        var report = RevenueReportCalculator.Build(rows, start, end, route, monthly);

        var bookingIds = rows.Select(x => x.BookingId).Distinct().ToList();
        var methods = await db.Payments.AsNoTracking()
            .Where(p => p.BookingId != null && bookingIds.Contains(p.BookingId.Value) &&
                        (p.Status == PaymentStatus.Success || p.Status == PaymentStatus.Refunded))
            .GroupBy(p => p.Method)
            .Select(g => new { Method = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) })
            .ToListAsync(ct);

        return Ok(new RevenueReportDto
        {
            Summary = report.Summary,
            TimeSeries = report.TimeSeries,
            ByRoute = report.ByRoute,
            ByPaymentMethod = methods
                .Select(m => new PaymentMethodRevenueDto { Method = m.Method.ToString(), Count = m.Count, Amount = m.Amount })
                .ToList()
        });
    }
}
