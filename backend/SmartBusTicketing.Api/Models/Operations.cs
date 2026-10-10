namespace SmartBusTicketing.Api.Models;

public class BusLocation
{
    public long Id { get; set; }
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long BusId { get; set; }
    public Bus Bus { get; set; } = null!;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class Incident
{
    public long Id { get; set; }
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long ReportedBy { get; set; }
    public Account Reporter { get; set; } = null!;
    public IncidentType IncidentType { get; set; }
    public int DelayMinutes { get; set; }
    public IncidentStatus Status { get; set; } = IncidentStatus.Open;

    /// <summary>Vị trí xảy ra sự cố do tài xế nhập (tên đường, trạm...).</summary>
    public string Location { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public long? ResolvedBy { get; set; }
    public Account? Resolver { get; set; }
    public string? ResolutionNote { get; set; }

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}

public class Notification
{
    public long Id { get; set; }
    public long AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public long? TripId { get; set; }
    public Trip? Trip { get; set; }
    public long? IncidentId { get; set; }
    public Incident? Incident { get; set; }
    public NotificationType Type { get; set; }
    public bool IsRead { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    /// <summary>Đường dẫn trang giao diện mở ra khi người dùng bấm vào thông báo (vd /passenger/payments).</summary>
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Feedback
{
    public long Id { get; set; }
    public long PassengerId { get; set; }
    public Account Passenger { get; set; } = null!;
    public long? RouteId { get; set; }
    public BusRoute? BusRoute { get; set; }
    public long? TripId { get; set; }
    public Trip? Trip { get; set; }
    public FeedbackType Type { get; set; }
    public string Subject { get; set; } = null!;
    /// <summary>
    /// Nội dung khiếu nại, hoặc nhận xét kèm theo khi hành khách đánh giá chuyến đi.
    /// Cột feedbacks.content trong schema.sql là NOT NULL nên đánh giá chỉ có sao lưu chuỗi rỗng.
    /// </summary>
    public string Content { get; set; } = string.Empty;
    public byte Rating { get; set; }
    public string? ImagePath { get; set; }
    public FeedbackStatus Status { get; set; } = FeedbackStatus.ChuaXuLy;
    public long? ProcessedBy { get; set; }
    public Account? Processor { get; set; }
    /// <summary>Thời điểm hành khách gửi, giờ UTC. Trang quản lý sắp xếp và lọc theo cột này.</summary>
    public DateTime CreatedAt { get; set; }

    public ICollection<FeedbackHistory> History { get; set; } = new List<FeedbackHistory>();
}

public class FeedbackHistory
{
    public long Id { get; set; }
    public long FeedbackId { get; set; }
    public Feedback Feedback { get; set; } = null!;
    public FeedbackStatus OldStatus { get; set; }
    public FeedbackStatus NewStatus { get; set; }
    public long ChangedBy { get; set; }
    public Account Changer { get; set; } = null!;
    public DateTime ChangedAt { get; set; }
}
