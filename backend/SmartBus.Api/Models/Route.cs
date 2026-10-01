namespace SmartBus.Api.Models;

public class Route
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string StartPoint { get; set; } = "";
    public string EndPoint { get; set; } = "";
    public bool Active { get; set; } = true;
}
