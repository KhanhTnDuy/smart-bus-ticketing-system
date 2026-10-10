using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

public sealed class NotificationDto
{
    public long Id { get; init; }
    /// <summary>BusArriving, Delay, Incident hoặc Other.</summary>
    public string Type { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? Link { get; init; }
    public long? TripId { get; init; }
    public bool IsRead { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class NotificationListDto
{
    /// <summary>Tổng số thông báo chưa đọc của tài khoản, không phụ thuộc số dòng trả về.</summary>
    public int UnreadCount { get; init; }
    public IReadOnlyList<NotificationDto> Items { get; init; } = [];
}

/// <summary>Thông báo của chính người đăng nhập. Không có endpoint xem thông báo của người khác.</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet("my")]
    public async Task<ActionResult<NotificationListDto>> GetMine([FromQuery] int take = 30, CancellationToken ct = default)
    {
        var me = User.AccountId();
        if (me is null) return Unauthorized();

        var unread = await db.Notifications.AsNoTracking().CountAsync(n => n.AccountId == me && !n.IsRead, ct);
        var items = await db.Notifications.AsNoTracking()
            .Where(n => n.AccountId == me)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Take(Math.Clamp(take, 1, 100))
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type.ToString(),
                Title = n.Title,
                Message = n.Message,
                Link = n.Link,
                TripId = n.TripId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(new NotificationListDto { UnreadCount = unread, Items = items });
    }

    [HttpPatch("{id:long}/read")]
    public async Task<IActionResult> MarkRead(long id, CancellationToken ct)
    {
        var me = User.AccountId();
        // Lọc theo AccountId để không đánh dấu được thông báo của người khác; không thấy thì trả 404.
        var updated = await db.Notifications
            .Where(n => n.Id == id && n.AccountId == me)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return updated == 0 ? NotFound() : NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var me = User.AccountId();
        await db.Notifications
            .Where(n => n.AccountId == me && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return NoContent();
    }
}
