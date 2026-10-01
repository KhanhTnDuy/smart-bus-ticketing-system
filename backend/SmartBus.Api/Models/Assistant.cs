namespace SmartBus.Api.Models;

public class Assistant
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string EmployeeCode { get; set; } = "";
    public bool Active { get; set; } = true;
}
