using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public sealed class LoginRequest
{
    [Required] public string Identity { get; set; } = "";
    [Required] public string Password { get; set; } = "";
}

public sealed class CreateAccountRequest
{
    [Required, StringLength(50)] public string Username { get; set; } = "";
    [Required, StringLength(255, MinimumLength = 8)] public string Password { get; set; } = "";
    [Required, StringLength(100)] public string FullName { get; set; } = "";
    [EmailAddress, StringLength(100)] public string? Email { get; set; }
    [StringLength(20)] public string? Phone { get; set; }
    public AccountRole Role { get; set; } = AccountRole.Passenger;
    public bool Active { get; set; } = true;
}

public sealed class UpdateAccountRequest
{
    [StringLength(100)] public string? FullName { get; set; }
    [EmailAddress, StringLength(100)] public string? Email { get; set; }
    [StringLength(20)] public string? Phone { get; set; }
    public AccountRole? Role { get; set; }
    public bool? Active { get; set; }
    [StringLength(255, MinimumLength = 8)] public string? Password { get; set; }
}

public sealed class UpdateRoleRequest
{
    [Required] public AccountRole Role { get; set; }
}

// RouteRequest, StopRequest, RouteStopItem và FareRequest đã được định nghĩa trong
// RouteManagementDtos.cs (bản của US3, có validation đầy đủ hơn) nên không khai báo lại ở đây.

public sealed class FeedbackRequest
{
    [Required] public long PassengerId { get; set; }
    public long? RouteId { get; set; }
    public long? TripId { get; set; }
    public FeedbackType Type { get; set; } = FeedbackType.Complaint;
    [Required, StringLength(300)] public string Subject { get; set; } = "";
    /// <summary>Nội dung khiếu nại, hoặc nhận xét khi đánh giá chuyến đi.</summary>
    [StringLength(4000)] public string? Content { get; set; }
    /// <summary>Số sao 1-5. Bắt buộc khi Type là Review, controller kiểm tra thêm (SCRUM-21).</summary>
    [Range(0, 5)] public byte Rating { get; set; }
    [StringLength(500)] public string? ImagePath { get; set; }
}

public sealed class FeedbackStatusRequest
{
    [Required] public FeedbackStatus Status { get; set; }
}

/// <summary>
/// Bản chiếu của Feedback dùng cho mọi phản hồi của API.
///
/// Trước đây controller trả thẳng entity kèm Include(Passenger), khiến cột
/// PasswordHash của người gửi bị đẩy xuống trình duyệt. DTO này chỉ mang các
/// trường mà giao diện cần.
/// </summary>
public class FeedbackDto
{
    public long Id { get; set; }
    public long PassengerId { get; set; }
    public string PassengerName { get; set; } = "";
    public string? PassengerEmail { get; set; }
    public string? PassengerPhone { get; set; }
    public long? RouteId { get; set; }
    public string? RouteCode { get; set; }
    public string? RouteName { get; set; }
    public long? TripId { get; set; }
    public FeedbackType Type { get; set; }
    public string Subject { get; set; } = "";
    public string Content { get; set; } = "";
    public byte Rating { get; set; }
    public string? ImagePath { get; set; }
    public FeedbackStatus Status { get; set; }
    public long? ProcessedBy { get; set; }
    public string? ProcessedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>Một lần đổi trạng thái, chỉ trả kèm khi xem chi tiết.</summary>
public sealed class FeedbackHistoryDto
{
    public long Id { get; set; }
    public FeedbackStatus OldStatus { get; set; }
    public FeedbackStatus NewStatus { get; set; }
    public long ChangedBy { get; set; }
    public string? ChangedByName { get; set; }
    public DateTime ChangedAt { get; set; }
}

public sealed class FeedbackDetailDto : FeedbackDto
{
    public List<FeedbackHistoryDto> History { get; set; } = [];
}
