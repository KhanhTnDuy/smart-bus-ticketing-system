namespace SmartBus.Api.Models;

public class AuditLog
{
    public int Id { get; set; }
    public string Action { get; set; } = "";
    public string EntityName { get; set; } = "";
    public int EntityId { get; set; }
    public string Actor { get; set; } = "SYSTEM";
    public string Details { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
