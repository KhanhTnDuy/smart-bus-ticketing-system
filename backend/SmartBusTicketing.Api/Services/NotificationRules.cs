using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// Tạo thông báo trong ứng dụng. Các hàm chỉ thêm vào ngữ cảnh, người gọi tự SaveChanges để thông báo
/// được lưu cùng giao dịch với sự kiện gây ra nó (nếu sự kiện thất bại thì không có thông báo ma).
/// </summary>
public static class NotificationRules
{
    public static void Notify(AppDbContext db, long accountId, NotificationType type, string title, string message,
        string? link = null, long? tripId = null, Incident? incident = null)
    {
        var n = new Notification
        {
            AccountId = accountId,
            Type = type,
            Title = title,
            Message = message,
            Link = link,
            TripId = tripId,
            CreatedAt = DateTime.UtcNow,
        };
        if (incident is not null) incident.Notifications.Add(n);
        else db.Notifications.Add(n);
    }

    /// <summary>Gửi cho mọi Admin và Quản lý đang hoạt động, trừ người gây ra sự kiện (nếu có).</summary>
    public static async Task NotifyManagementAsync(AppDbContext db, string title, string message, string? link,
        long? exceptAccountId, CancellationToken ct, long? tripId = null, NotificationType type = NotificationType.Other)
    {
        var ids = await db.Accounts.AsNoTracking()
            .Where(a => a.Active && (a.Role == AccountRole.Admin || a.Role == AccountRole.Manager) && a.Id != exceptAccountId)
            .Select(a => a.Id)
            .ToListAsync(ct);
        foreach (var id in ids) Notify(db, id, type, title, message, link, tripId);
    }
}
