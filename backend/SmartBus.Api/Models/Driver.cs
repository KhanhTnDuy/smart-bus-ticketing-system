namespace SmartBus.Api.Models;

public class Driver
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string LicenseNumber { get; set; } = "";
    public bool Active { get; set; } = true;
}
