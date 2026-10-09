using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>Một vé của lượt đặt đã thanh toán, kèm số tiền của cả lượt đặt để chia đều về từng vé.</summary>
public sealed record RevenueTicketRow(
    long BookingId,
    decimal BookingAmount,
    TicketStatus Status,
    DateTime DepartureAtUtc,
    long RouteId,
    string RouteCode,
    string RouteName);

/// <summary>
/// Tính doanh thu thuần từ vé. Tách khỏi controller để đối chiếu số liệu mà không cần cơ sở dữ liệu.
///
/// Quy ước đối chiếu:
/// - Vé đã bán là vé Valid hoặc Used. Vé Cancelled được tách ra thành hoàn tiền, nên không nằm trong
///   doanh thu thuần. Vé Exchanged bị loại hẳn vì đã có vé mới thay thế trong cùng lượt đặt.
/// - Booking.FinalAmount là tiền của cả lượt đặt, chia đều cho các vé còn hiệu lực của lượt đó
///   (không tính Exchanged). Vì vậy tổng tiền từng vé luôn bằng FinalAmount, kể cả khi đã hủy bớt.
/// - Doanh thu thuần = tổng gộp - hoàn tiền, tính sau khi làm tròn từng khoản về đồng để các số cộng khớp nhau.
/// - Kỳ báo cáo lấy theo ngày khởi hành của chuyến, theo giờ Việt Nam (UTC+7).
/// </summary>
public static class RevenueReportCalculator
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static RevenueReportDto Build(
        IEnumerable<RevenueTicketRow> rows,
        DateOnly? startDate,
        DateOnly? endDate,
        long? routeId,
        bool monthly)
    {
        var lines = new List<(RevenueTicketRow Row, decimal Unit, bool Refunded, DateOnly Day)>();

        foreach (var booking in rows.GroupBy(r => r.BookingId))
        {
            var effective = booking.Where(r => r.Status != TicketStatus.Exchanged).ToList();
            if (effective.Count == 0) continue;

            var unit = booking.First().BookingAmount / effective.Count;
            foreach (var r in effective)
            {
                var sold = r.Status is TicketStatus.Valid or TicketStatus.Used;
                var refunded = r.Status == TicketStatus.Cancelled;
                if (!sold && !refunded) continue;

                var day = DateOnly.FromDateTime(r.DepartureAtUtc + VietnamOffset);
                if (startDate is { } s && day < s) continue;
                if (endDate is { } e && day > e) continue;
                if (routeId is { } rid && r.RouteId != rid) continue;

                lines.Add((r, unit, refunded, day));
            }
        }

        static decimal Round(decimal v) => Math.Round(v, 0, MidpointRounding.AwayFromZero);

        var timeSeries = lines
            .GroupBy(l => monthly ? l.Day.ToString("yyyy-MM") : l.Day.ToString("yyyy-MM-dd"))
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .Select(g =>
            {
                var gross = Round(g.Sum(l => l.Unit));
                var refund = Round(g.Where(l => l.Refunded).Sum(l => l.Unit));
                return new RevenueItemDto
                {
                    Period = g.Key,
                    TicketCount = g.Count(l => !l.Refunded),
                    GrossRevenue = gross,
                    RefundAmount = refund,
                    NetRevenue = gross - refund
                };
            })
            .ToList();

        var byRoute = lines
            .Where(l => !l.Refunded)
            .GroupBy(l => l.Row.RouteId)
            .Select(g => new RouteRevenueDto
            {
                RouteId = g.Key.ToString(),
                RouteCode = g.First().Row.RouteCode,
                RouteName = g.First().Row.RouteName,
                TicketCount = g.Count(),
                Revenue = Round(g.Sum(l => l.Unit))
            })
            .OrderByDescending(r => r.Revenue)
            .ToList();

        var totalGross = Round(lines.Sum(l => l.Unit));
        var totalRefund = Round(lines.Where(l => l.Refunded).Sum(l => l.Unit));
        var soldCount = lines.Count(l => !l.Refunded);
        var net = totalGross - totalRefund;

        return new RevenueReportDto
        {
            Summary = new RevenueSummaryDto
            {
                TotalGross = totalGross,
                TotalRefund = totalRefund,
                NetRevenue = net,
                SuccessfulTickets = soldCount,
                RefundedTickets = lines.Count(l => l.Refunded),
                AverageTicketPrice = soldCount == 0 ? 0 : Round(net / soldCount)
            },
            TimeSeries = timeSeries,
            ByRoute = byRoute
        };
    }
}
