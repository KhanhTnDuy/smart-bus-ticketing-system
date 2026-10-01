namespace SmartBus.Api.Models;

public class Trip
{
    public int Id { get; set; }
    public int ScheduleId { get; set; }
    public TripAssignment? Assignment { get; set; }
    public string RouteName { get; set; } = "";
    public string StartPoint { get; set; } = "";
    public string EndPoint { get; set; } = "";
    public DateTime DepartureTime { get; set; }
    public DateTime ArrivalTime { get; set; }
    public decimal Fare { get; set; }
    public string Status { get; set; } = "PLANNED";

    public int? AvailableSeats { get; set; }
}
