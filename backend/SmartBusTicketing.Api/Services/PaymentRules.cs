using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services.Payments;

namespace SmartBusTicketing.Api.Services;

/// <summary>Quy tắc tiền của vé, dùng chung cho hủy vé và hủy chuyến.</summary>
public static class PaymentRules
{
    /// <summary>
    /// Tạo yêu cầu hoàn tiền cho một vé đã thanh toán vừa bị hủy. Trả về null nếu lượt đặt chưa thanh toán
    /// hoặc không còn tiền nào để hoàn. Giá mỗi vé là số tiền thanh toán chia đều cho các vé của lượt đặt
    /// (không tính vé đã đổi), cùng quy ước với báo cáo doanh thu, và tổng hoàn không vượt số tiền đã trả.
    /// Hàm chỉ thêm Refund vào ngữ cảnh, người gọi tự SaveChanges.
    ///
    /// Hủy vé của khách (TicketCancelled) hoàn theo chính sách giờ trong <paramref name="options"/> nếu có cấu hình
    /// (Refunds:Tiers); hủy chuyến và thanh toán lỗi luôn hoàn 100% vì lỗi không do khách.
    /// </summary>
    public static async Task<Refund?> CreateTicketRefundAsync(
        AppDbContext db, Ticket ticket, long? changeRequestId, RefundReason reason, DateTime now, CancellationToken ct,
        RefundOptions? options = null)
    {
        var payment = await db.Payments
            .Include(p => p.Refunds)
            .Where(p => p.BookingId == ticket.BookingId && p.Status == PaymentStatus.Success)
            .OrderBy(p => p.Id)
            .FirstOrDefaultAsync(ct);
        if (payment is null) return null;

        var ticketCount = await db.Tickets.CountAsync(t => t.BookingId == ticket.BookingId && t.Status != TicketStatus.Exchanged, ct);
        if (ticketCount == 0) return null;

        var unit = Math.Round(payment.Amount / ticketCount, 0, MidpointRounding.AwayFromZero);

        var percent = 100;
        if (reason == RefundReason.TicketCancelled)
        {
            var dbTiers = await db.RefundTiers
                .AsNoTracking()
                .Select(t => new RefundTier { HoursBefore = t.HoursBefore, Percent = t.Percent })
                .ToListAsync(ct);
            var activeTiers = dbTiers.Count > 0 ? dbTiers : options?.Tiers ?? [];
            if (activeTiers.Count > 0)
            {
                var departure = await db.Trips.Where(t => t.Id == ticket.TripId).Select(t => t.DepartureAt).FirstAsync(ct);
                percent = RefundPolicy.PercentFor((departure - now).TotalHours, activeTiers);
            }
        }

        var alreadyRefunded = payment.Refunds.Where(r => r.Status != RefundStatus.Failed).Sum(r => r.Amount);
        var amount = Math.Min(Math.Round(unit * percent / 100m, 0, MidpointRounding.AwayFromZero), payment.Amount - alreadyRefunded);
        if (amount <= 0) return null;

        var refund = new Refund
        {
            PaymentId = payment.Id,
            ChangeRequestId = changeRequestId,
            Amount = amount,
            Reason = reason,
            Status = RefundStatus.Pending,
            CreatedAt = now,
            Note = percent < 100 ? $"Theo chính sách hoàn {percent}% tiền vé." : null,
        };
        db.Refunds.Add(refund);
        await NotificationRules.NotifyManagementAsync(db, "Yêu cầu hoàn tiền mới",
            $"Cần hoàn {amount:N0} đ cho lượt đặt vừa hủy vé.", "/manager/refunds", null, ct, ticket.TripId);
        return refund;
    }
}
