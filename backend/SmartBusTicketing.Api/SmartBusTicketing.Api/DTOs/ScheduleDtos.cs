using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

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
