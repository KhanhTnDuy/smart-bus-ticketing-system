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

public sealed class RouteRequest
{
    [Required, StringLength(20)] public string Code { get; set; } = "";
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Required, StringLength(150)] public string StartPoint { get; set; } = "";
    [Required, StringLength(150)] public string EndPoint { get; set; } = "";
    [Range(0, 999999)] public decimal DistanceKm { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class StopRequest
{
    [Required, StringLength(150)] public string Name { get; set; } = "";
    [Range(-90, 90)] public decimal Latitude { get; set; }
    [Range(-180, 180)] public decimal Longitude { get; set; }
}

public sealed class RouteStopItem
{
    [Range(1, long.MaxValue)] public long StopId { get; set; }
    [Range(1, int.MaxValue)] public int StopOrder { get; set; }
    [Range(0, int.MaxValue)] public int MinutesFromStart { get; set; }
}

public sealed class FareRequest
{
    public TicketType TicketType { get; set; } = TicketType.Single;
    public int PassengerTypeId { get; set; }
    [Range(0, 999999999)] public decimal Price { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public sealed class FeedbackRequest
{
    [Required] public long PassengerId { get; set; }
    public long? RouteId { get; set; }
    public long? TripId { get; set; }
    public FeedbackType Type { get; set; } = FeedbackType.Complaint;
    [Required, StringLength(300)] public string Subject { get; set; } = "";
    [Range(0, 5)] public byte Rating { get; set; }
    [StringLength(500)] public string? ImagePath { get; set; }
}

public sealed class FeedbackStatusRequest
{
    [Required] public FeedbackStatus Status { get; set; }
}
