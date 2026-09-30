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
