namespace SmartBus.Api.Models;

public class Schedule
{
    public int Id { get; set; }
    public int? RouteId { get; set; }
    public Route? Route { get; set; }
    public string RouteName { get; set; } = "";
    public string StartPoint { get; set; } = "";
    public string EndPoint { get; set; } = "";
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public int FrequencyMinutes { get; set; }
    public string DaysOfWeek { get; set; } = "MON,TUE,WED,THU,FRI";
    public decimal Fare { get; set; }
    public bool Active { get; set; } = true;
}
