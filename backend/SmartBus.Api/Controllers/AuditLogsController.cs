using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
public class AuditLogsController : ControllerBase
{
    private readonly SmartBusDbContext _db;

    public AuditLogsController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.AuditLogs.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync());
}
