using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public sealed class AuditLogService(AppDbContext db)
{
    public async Task WriteAsync(long? accountId, string username, string action, AuditActionType type,
        string? target = null, AuditStatus status = AuditStatus.Success, string? details = null, CancellationToken ct = default)
    {
        db.AuditLogs.Add(new AuditLog
        {
            AccountId = accountId,
            Username = username,
            Action = action,
            ActionType = type,
            TargetResource = target,
            Status = status,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }
}
