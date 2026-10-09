namespace SmartBusTicketing.Api.DTOs;

/// <summary>Tổng hợp doanh thu bán vé; khớp với RevenueReportResponse ở frontend/src/api/revenueReport.ts.</summary>
public sealed class RevenueReportDto
{
    public RevenueSummaryDto Summary { get; init; } = new();
    public IReadOnlyList<RevenueItemDto> TimeSeries { get; init; } = [];
    public IReadOnlyList<RouteRevenueDto> ByRoute { get; init; } = [];
    public IReadOnlyList<PaymentMethodRevenueDto> ByPaymentMethod { get; init; } = [];
}

public sealed class RevenueSummaryDto
{
    public decimal TotalGross { get; init; }
    public decimal TotalRefund { get; init; }
    public decimal NetRevenue { get; init; }
    public int SuccessfulTickets { get; init; }
    public int RefundedTickets { get; init; }
    public decimal AverageTicketPrice { get; init; }
}

public sealed class RevenueItemDto
{
    public string Period { get; init; } = string.Empty;
    public int TicketCount { get; init; }
    public decimal GrossRevenue { get; init; }
    public decimal RefundAmount { get; init; }
    public decimal NetRevenue { get; init; }
}

public sealed class RouteRevenueDto
{
    public string RouteId { get; init; } = string.Empty;
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public int TicketCount { get; init; }
    public decimal Revenue { get; init; }
}

public sealed class PaymentMethodRevenueDto
{
    public string Method { get; init; } = string.Empty;
    public int Count { get; init; }
    public decimal Amount { get; init; }
}
