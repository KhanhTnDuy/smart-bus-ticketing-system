namespace SmartBus.Api.Models;

public class TripAssignment
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public int BusId { get; set; }
    public int DriverId { get; set; }
    public int? AssistantId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public Trip? Trip { get; set; }
    public Bus? Bus { get; set; }
    public Driver? Driver { get; set; }
    public Assistant? Assistant { get; set; }
}
