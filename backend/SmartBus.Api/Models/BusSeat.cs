namespace SmartBus.Api.Models;

public class BusSeat
{
    public int Id { get; set; }
    public int BusId { get; set; }
    public string SeatNumber { get; set; } = "";
}
