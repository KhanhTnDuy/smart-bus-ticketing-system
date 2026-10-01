using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public sealed class BusRequest
{
    [Required, StringLength(20)]
    public string PlateNumber { get; set; } = "";
    [Range(1, 500)]
    public int Capacity { get; set; }
    public BusStatus Status { get; set; } = BusStatus.Active;
}

public sealed class SeatRequest
{
    [Required, StringLength(20)]
    public string SeatCode { get; set; } = "";
    [Range(1, 100)]
    public int SeatRow { get; set; }
    [Range(1, 100)]
    public int SeatCol { get; set; }
}

public sealed class ScheduleRequest
{
    [Required]
    public long RouteId { get; set; }
    public TimeOnly FirstDeparture { get; set; }
    public TimeOnly LastDeparture { get; set; }
    [Range(1, 1440)]
    public int FrequencyMinutes { get; set; }
    [Required, StringLength(100)]
    public string DaysOfWeek { get; set; } = "";
}

public sealed class TripRequest
{
    [Required]
    public long RouteId { get; set; }
    public long? ScheduleId { get; set; }
    public long? BusId { get; set; }
    public DateTime DepartureAt { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Scheduled;
    [Range(0, 1440)]
    public int DelayMinutes { get; set; }
}

public sealed class AssignBusRequest
{
    [Required]
    public long BusId { get; set; }
}

public sealed class UpdateTripStatusRequest
{
    [Required]
    public TripStatus Status { get; set; }
    [Range(0, 1440)]
    public int DelayMinutes { get; set; }
}

public sealed class TripStaffRequest
{
    [Required]
    public long AccountId { get; set; }
    [Required]
    public StaffDuty Duty { get; set; }
}
