namespace SmartBus.Api.Models;

public class SeatReservation
{
    public int Id { get; set; }
    public int TripId { get; set; }
    public string SeatNumber { get; set; } = "";
    public string PassengerName { get; set; } = "";
    public string Status { get; set; } = "SELECTED";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
