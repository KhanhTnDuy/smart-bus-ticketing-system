using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin,Manager")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Xem và lọc nhật ký thao tác. Chỉ Admin và Manager được truy cập.
    /// from/to được hiểu là ngày UTC; to bao gồm toàn bộ ngày được chọn.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? username,
        [FromQuery] int? actionType,
        [FromQuery] AuditStatus? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        if (from.HasValue && to.HasValue && from.Value > to.Value)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
            });
        }

        var query = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(username))
        {
            var value = username.Trim();
            query = query.Where(x => x.Username.Contains(value));
        }

        if (actionType.HasValue)
            query = query.Where(x => (int)x.ActionType == actionType.Value);

        if (status.HasValue)
            query = query.Where(x => x.Status == status.Value);

        if (from.HasValue)
        {
            var startUtc = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAt >= startUtc);
        }

        if (to.HasValue)
        {
            var endExclusiveUtc = to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAt < endExclusiveUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(x => x.Action.Contains(value)
                || (x.TargetResource != null && x.TargetResource.Contains(value))
                || (x.Details != null && x.Details.Contains(value)));
        }

        var logs = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        return Ok(logs);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var log = await db.AuditLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return log is null ? NotFound() : Ok(log);
    }
}
