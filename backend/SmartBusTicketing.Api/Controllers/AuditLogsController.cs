using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin")]
public class AuditLogsController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Tìm kiếm và lọc nhật ký theo người dùng, loại thao tác, trạng thái và khoảng thời gian (SCRUM-16).
    /// `from` và `to` là ngày theo giờ UTC; `to` được tính bao gồm cả ngày đó.
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
        if (from.HasValue && to.HasValue && from > to)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Ngày bắt đầu không được lớn hơn ngày kết thúc." });

        var q = db.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(username)) q = q.Where(x => x.Username.Contains(username));
        if (actionType.HasValue) q = q.Where(x => (int)x.ActionType == actionType.Value);
        if (status.HasValue) q = q.Where(x => x.Status == status.Value);

        if (from.HasValue)
        {
            var start = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            q = q.Where(x => x.CreatedAt >= start);
        }
        if (to.HasValue)
        {
            // Lấy hết ngày `to` nên so sánh với 00:00 của ngày kế tiếp.
            var endExclusive = to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            q = q.Where(x => x.CreatedAt < endExclusive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            q = q.Where(x => x.Action.Contains(value)
                || (x.TargetResource != null && x.TargetResource.Contains(value))
                || (x.Details != null && x.Details.Contains(value)));
        }

        return Ok(await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct));
    }
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) { var log = await db.AuditLogs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct); return log is null ? NotFound() : Ok(log); }
}
