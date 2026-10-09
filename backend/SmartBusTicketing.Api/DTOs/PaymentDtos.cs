using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public sealed class PayBookingRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn lượt đặt cần thanh toán.")]
    public long BookingId { get; init; }

    public PaymentMethod Method { get; init; }
}

public sealed class RefundSummaryDto
{
    public long Id { get; init; }
    public decimal Amount { get; init; }
    /// <summary>Pending, Success hoặc Failed.</summary>
    public string Status { get; init; } = string.Empty;
    /// <summary>PaymentFailed, TicketCancelled hoặc TripCancelled.</summary>
    public string Reason { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? ProcessedAt { get; init; }
    public string? Note { get; init; }
}

public sealed class PaymentDto
{
    public long Id { get; init; }
    public long BookingId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public long PassengerId { get; init; }
    public string PassengerName { get; init; } = string.Empty;
    public string Method { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    /// <summary>Pending, Success, Failed hoặc Refunded.</summary>
    public string Status { get; init; } = string.Empty;
    public string? ProviderTxnId { get; init; }
    public DateTime? PaidAt { get; init; }
    public long TripId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public DateTime DepartureAt { get; init; }
    public IReadOnlyList<string> Seats { get; init; } = [];
    public long? InvoiceId { get; init; }
    public string? InvoiceNo { get; init; }
    public decimal RefundedAmount { get; init; }
    public IReadOnlyList<RefundSummaryDto> Refunds { get; init; } = [];
}

public sealed class InvoiceDto
{
    public long Id { get; init; }
    public long PassengerId { get; init; }
    public string InvoiceNo { get; init; } = string.Empty;
    public long PaymentId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public string PassengerName { get; init; } = string.Empty;
    public string? Email { get; init; }
    public decimal Total { get; init; }
    public string Method { get; init; } = string.Empty;
    public DateTime? PaidAt { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public DateTime DepartureAt { get; init; }
    public IReadOnlyList<string> Seats { get; init; } = [];
}

public sealed class RefundDto
{
    public long Id { get; init; }
    public long PaymentId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public string PassengerName { get; init; } = string.Empty;
    public string? PassengerEmail { get; init; }
    public string? PassengerPhone { get; init; }
    public string PaymentMethod { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string Reason { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime? ProcessedAt { get; init; }
    public string? ProcessedByName { get; init; }
    public string? Note { get; init; }
    public long? ChangeRequestId { get; init; }
}

public sealed class ProcessRefundRequest
{
    /// <summary>true: hoàn tiền thành công; false: từ chối, bắt buộc ghi lý do trong Note.</summary>
    public bool Approve { get; init; }

    [StringLength(2000)]
    public string? Note { get; init; }
}
