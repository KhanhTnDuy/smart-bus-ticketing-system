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
    /// <summary>Lý do thất bại hoặc hết hạn, chỉ có khi Status là Failed.</summary>
    public string? FailureReason { get; init; }
    /// <summary>Địa chỉ trang thanh toán của ngân hàng. Chỉ có ngay trong phản hồi khởi tạo thanh toán qua cổng.</summary>
    public string? PaymentUrl { get; set; }
    /// <summary>Mã tham chiếu của giao dịch. Với chuyển khoản đây là nội dung chuyển khoản khách phải ghi.</summary>
    public string? Reference { get; init; }
    /// <summary>Hết thời điểm này mà chưa thanh toán thì chỗ được nhả.</summary>
    public DateTime HoldExpiresAt { get; init; }
    /// <summary>Thông tin chuyển khoản (mã VietQR, tài khoản nhận, nội dung). Chỉ có khi giao dịch chuyển khoản còn chờ.</summary>
    public BankTransferInfoDto? Transfer { get; set; }
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

/// <summary>Thông tin để khách chuyển khoản vào tài khoản ngân hàng của đơn vị.</summary>
public sealed class BankTransferInfoDto
{
    public string BankId { get; init; } = string.Empty;
    public string BankName { get; init; } = string.Empty;
    public string AccountNumber { get; init; } = string.Empty;
    public string AccountName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    /// <summary>Nội dung chuyển khoản bắt buộc, dùng để hệ thống nhận ra khoản tiền thuộc lượt đặt nào.</summary>
    public string Memo { get; init; } = string.Empty;
    /// <summary>Ảnh mã VietQR đã điền sẵn tài khoản, số tiền và nội dung.</summary>
    public string QrUrl { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
}

/// <summary>Quản lý xác nhận đã nhận tiền chuyển khoản.</summary>
public sealed class ConfirmTransferRequest
{
    /// <summary>Mã giao dịch trên sao kê ngân hàng (nếu có), dùng để chống xác nhận trùng một khoản tiền.</summary>
    [StringLength(64)]
    public string? BankTransactionId { get; init; }
}

/// <summary>Yêu cầu gửi (lại) email hóa đơn. Email chỉ nhận được khi hóa đơn chưa có địa chỉ.</summary>
public sealed class SendInvoiceEmailRequest
{
    [EmailAddress(ErrorMessage = "Địa chỉ email không hợp lệ.")]
    [StringLength(254, ErrorMessage = "Địa chỉ email quá dài.")]
    public string? Email { get; init; }
}

/// <summary>Kết quả khách thấy sau khi quay về từ trang thanh toán của ngân hàng.</summary>
public sealed class PaymentResultDto
{
    public bool Success { get; init; }
    public string Message { get; init; } = string.Empty;
    public PaymentDto Payment { get; init; } = null!;
}

/// <summary>Tổng hợp hóa đơn theo bộ lọc đang xem, để đối chiếu với báo cáo doanh thu cùng kỳ (SCRUM-99).</summary>
public sealed class InvoiceSummaryDto
{
    public int Count { get; init; }
    public decimal Total { get; init; }
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
    /// <summary>Thời điểm email hóa đơn được gửi, rỗng nếu chưa gửi.</summary>
    public DateTime? SentAt { get; init; }
    /// <summary>Sent (đã gửi), Pending (đang chờ gửi hoặc đang thử lại), Failed (quá số lần thử), NoAddress (tài khoản chưa có email).</summary>
    public string EmailStatus { get; init; } = string.Empty;
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
    /// <summary>Số lần hệ thống đã thử hoàn qua cổng.</summary>
    public int Attempts { get; init; }
    /// <summary>Đang chờ nhưng đã ngừng tự động (cổng từ chối hoặc quá số lần thử): quản lý phải đối soát và xử lý tay.</summary>
    public bool NeedsManual { get; init; }
}

public sealed class ProcessRefundRequest
{
    /// <summary>true: hoàn tiền thành công; false: từ chối, bắt buộc ghi lý do trong Note.</summary>
    public bool Approve { get; init; }

    [StringLength(2000)]
    public string? Note { get; init; }

    /// <summary>
    /// Chỉ dùng khi duyệt: true nghĩa là quản lý đã hoàn tiền cho khách bằng đường khác (đối soát với VNPay), hệ thống chỉ
    /// ghi nhận mà không gọi cổng nữa. Bắt buộc ghi mã hoàn/đối soát trong Note. Không đặt thì khoản hoàn VNPay được hoàn qua cổng.
    /// </summary>
    public bool ConfirmedExternally { get; init; }
}

public sealed record RefundTierDto(int Id, int HoursBefore, int Percent);
public sealed record RefundTierRequest(int HoursBefore, int Percent);

