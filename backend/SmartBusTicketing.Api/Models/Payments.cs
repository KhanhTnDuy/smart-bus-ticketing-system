namespace SmartBusTicketing.Api.Models;

public class Payment
{
    public long Id { get; set; }
    public long? BookingId { get; set; }
    public Booking? Booking { get; set; }
    public long? MonthlyPassId { get; set; }
    public MonthlyPass? MonthlyPass { get; set; }
    public PaymentMethod Method { get; set; }
    public decimal Amount { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    /// <summary>Mã giao dịch do cổng thanh toán cấp (VNPay: vnp_TransactionNo). Chỉ có sau khi thanh toán xong.</summary>
    public string? ProviderTxnId { get; set; }
    public DateTime? PaidAt { get; set; }

    /// <summary>Mã tham chiếu hệ thống gửi cổng thanh toán cho mỗi lần thanh toán (VNPay: vnp_TxnRef), duy nhất.</summary>
    public string? TxnRef { get; set; }

    /// <summary>Thời điểm thanh toán theo cổng, dạng yyyyMMddHHmmss giờ Việt Nam. VNPay đòi lại giá trị này khi hoàn tiền.</summary>
    public string? GatewayPayDate { get; set; }

    /// <summary>Thời điểm tạo thanh toán gửi cổng (vnp_CreateDate), dạng yyyyMMddHHmmss giờ Việt Nam. Có thể cần khi hoàn tiền.</summary>
    public string? GatewayCreateDate { get; set; }

    /// <summary>Lý do giao dịch thất bại hoặc hết hạn, hiển thị cho khách và quản lý.</summary>
    public string? FailureReason { get; set; }

    public Invoice? Invoice { get; set; }
    public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}

public class Invoice
{
    public long Id { get; set; }
    public long PaymentId { get; set; }
    public Payment Payment { get; set; } = null!;
    public string InvoiceNo { get; set; } = null!;
    public string Email { get; set; } = null!;
    public decimal Total { get; set; }

    /// <summary>Thời điểm gửi email hóa đơn thành công. Rỗng nghĩa là chưa gửi (chờ gửi, thất bại hoặc chưa có địa chỉ).</summary>
    public DateTime? SentAt { get; set; }

    /// <summary>Số lần đã thử gửi. Tới InvoiceEmailService.MaxAttempts thì ngừng tự thử lại; khách bấm gửi lại sẽ đặt về 0.</summary>
    public int EmailAttempts { get; set; }

    /// <summary>Lý do lần gửi gần nhất thất bại (cắt ngắn), chỉ để quản trị xem, không trả ra API.</summary>
    public string? EmailError { get; set; }
}

public class Refund
{
    public long Id { get; set; }
    public long PaymentId { get; set; }
    public Payment Payment { get; set; } = null!;
    public long? ChangeRequestId { get; set; }
    public TicketChangeRequest? ChangeRequest { get; set; }
    public decimal Amount { get; set; }
    public RefundReason Reason { get; set; }
    public RefundStatus Status { get; set; } = RefundStatus.Pending;
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public long? ProcessedBy { get; set; }
    public Account? Processor { get; set; }
    public string? Note { get; set; }

    /// <summary>Số lần hệ thống đã thử hoàn qua cổng. Bằng RefundExecutor.MaxAttempts nghĩa là ngừng tự động, cần xử lý tay.</summary>
    public int Attempts { get; set; }

    public DateTime? LastAttemptAt { get; set; }

    /// <summary>Mã giao dịch hoàn do cổng cấp (VNPay: vnp_TransactionNo của lần hoàn).</summary>
    public string? GatewayRefId { get; set; }
}

public class MonthlyPass
{
    public long Id { get; set; }
    public long PassengerId { get; set; }
    public Account Passenger { get; set; } = null!;
    public long? RouteId { get; set; }
    public BusRoute? BusRoute { get; set; }
    public int PassengerTypeId { get; set; }
    public PassengerType PassengerType { get; set; } = null!;
    public long? PreviousPassId { get; set; }
    public MonthlyPass? PreviousPass { get; set; }
    public DateOnly ValidFrom { get; set; }
    public DateOnly ValidTo { get; set; }
    public string QrCode { get; set; } = null!;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public ICollection<TicketScan> Scans { get; set; } = new List<TicketScan>();
}

/// <summary>
/// Một bậc chính sách hoàn tiền lưu trong DB. Khi hủy vé còn ít nhất <see cref="HoursBefore"/> giờ trước giờ
/// khởi hành thì hoàn <see cref="Percent"/>% tiền vé. Thay thế cấu hình Refunds:Tiers trong appsettings.
/// </summary>
public class RefundTierRow
{
    public long Id { get; set; }
    /// <summary>Số giờ trước giờ khởi hành để áp bậc này.</summary>
    public int HoursBefore { get; set; }
    /// <summary>Phần trăm được hoàn, 0–100.</summary>
    public int Percent { get; set; }
}
