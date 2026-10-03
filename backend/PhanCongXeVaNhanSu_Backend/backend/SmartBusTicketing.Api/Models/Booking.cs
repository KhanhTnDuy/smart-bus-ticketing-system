namespace SmartBusTicketing.Api.Models;

public class Booking
{
    public long Id { get; set; }
    public string BookingCode { get; set; } = null!;
    public long PassengerId { get; set; }
    public Account Passenger { get; set; } = null!;
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long? VoucherId { get; set; }
    public Voucher? Voucher { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Pending;
    public DateTime HoldExpiresAt { get; set; }
    public decimal FinalAmount { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

public class Ticket
{
    public long Id { get; set; }
    public long BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long SeatId { get; set; }
    public Seat Seat { get; set; } = null!;
    public long BoardStopId { get; set; }
    public Stop BoardStop { get; set; } = null!;
    public long AlightStopId { get; set; }
    public Stop AlightStop { get; set; } = null!;
    public string QrCode { get; set; } = null!;
    public TicketStatus Status { get; set; } = TicketStatus.Held;

    public ICollection<TicketChangeRequest> ChangeRequests { get; set; } = new List<TicketChangeRequest>();
    public ICollection<TicketScan> Scans { get; set; } = new List<TicketScan>();
}

public class TicketChangeRequest
{
    public long Id { get; set; }
    public long TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;
    public ChangeRequestType RequestType { get; set; }
    public long? NewTripId { get; set; }
    public Trip? NewTrip { get; set; }
    public ChangeRequestStatus Status { get; set; } = ChangeRequestStatus.Pending;
    public long? ProcessedBy { get; set; }
    public Account? Processor { get; set; }

    public ICollection<Refund> Refunds { get; set; } = new List<Refund>();
}

public class TicketScan
{
    public long Id { get; set; }
    public long? TicketId { get; set; }
    public Ticket? Ticket { get; set; }
    public long? MonthlyPassId { get; set; }
    public MonthlyPass? MonthlyPass { get; set; }
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long ScannedBy { get; set; }
    public Account Scanner { get; set; } = null!;
    public ScanResult Result { get; set; }
}

public class Voucher
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int UsageLimit { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
