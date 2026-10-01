namespace SmartBus.Api.Models;

public class Bus
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string PlateNumber { get; set; } = "";
    public int SeatRows { get; set; }
    public int SeatColumns { get; set; }
    public bool Active { get; set; } = true;
}
