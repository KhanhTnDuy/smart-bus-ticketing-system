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
    public string? ProviderTxnId { get; set; }
    public DateTime? PaidAt { get; set; }

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
    public DateTime? SentAt { get; set; }
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
