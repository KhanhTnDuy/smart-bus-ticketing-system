using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? username, [FromQuery] int? actionType, CancellationToken ct)
    {
        var q = db.AuditLogs.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(username)) q = q.Where(x => x.Username.Contains(username));
        if (actionType.HasValue) q = q.Where(x => (int)x.ActionType == actionType.Value);
        return Ok(await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) { var log = await db.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct); return log is null ? NotFound() : Ok(log); }
}
