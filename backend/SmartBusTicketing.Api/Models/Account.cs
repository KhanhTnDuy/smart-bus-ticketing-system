namespace SmartBusTicketing.Api.Models;

public class Account
{
    public long Id { get; set; }
    public string Username { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public AccountRole Role { get; set; } = AccountRole.Passenger;
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<PassengerVerification> PassengerVerifications { get; set; } = new List<PassengerVerification>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<MonthlyPass> MonthlyPasses { get; set; } = new List<MonthlyPass>();
}

public class AuditLog
{
    public long Id { get; set; }
    public long? AccountId { get; set; }
    public Account? Account { get; set; }
    public string Username { get; set; } = null!;
    public string Action { get; set; } = null!;
    public AuditActionType ActionType { get; set; }
    public string? TargetResource { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public AuditStatus Status { get; set; } = AuditStatus.Success;
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PassengerType
{
    public int Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public decimal DiscountPercent { get; set; }

    public ICollection<PassengerVerification> PassengerVerifications { get; set; } = new List<PassengerVerification>();
    public ICollection<Fare> Fares { get; set; } = new List<Fare>();
    public ICollection<MonthlyPass> MonthlyPasses { get; set; } = new List<MonthlyPass>();
}

public class PassengerVerification
{
    public long Id { get; set; }
    public long AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public int PassengerTypeId { get; set; }
    public PassengerType PassengerType { get; set; } = null!;
    public string DocumentUrl { get; set; } = null!;
    public VerificationStatus Status { get; set; } = VerificationStatus.Pending;
    public long? ReviewedBy { get; set; }
    public Account? Reviewer { get; set; }
    public DateOnly? ValidUntil { get; set; }
    public DateTime SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }

    /// <summary>Lý do từ chối do người duyệt nhập; hành khách đọc được để nộp lại hồ sơ đúng.</summary>
    public string? RejectReason { get; set; }
}
