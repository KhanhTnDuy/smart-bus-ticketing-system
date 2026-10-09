using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>Quy tắc tiền của vé, dùng chung cho hủy vé và hủy chuyến.</summary>
public static class PaymentRules
{
    /// <summary>
    /// Tạo yêu cầu hoàn tiền cho một vé đã thanh toán vừa bị hủy. Trả về null nếu lượt đặt chưa thanh toán
    /// hoặc không còn tiền nào để hoàn. Giá mỗi vé là số tiền thanh toán chia đều cho các vé của lượt đặt
    /// (không tính vé đã đổi), cùng quy ước với báo cáo doanh thu, và tổng hoàn không vượt số tiền đã trả.
    /// Hàm chỉ thêm Refund vào ngữ cảnh, người gọi tự SaveChanges.
    /// </summary>
    public static async Task<Refund?> CreateTicketRefundAsync(
        AppDbContext db, Ticket ticket, long? changeRequestId, RefundReason reason, DateTime now, CancellationToken ct)
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
        var alreadyRefunded = payment.Refunds.Where(r => r.Status != RefundStatus.Failed).Sum(r => r.Amount);
        var amount = Math.Min(unit, payment.Amount - alreadyRefunded);
        if (amount <= 0) return null;

        var refund = new Refund
        {
            PaymentId = payment.Id,
            ChangeRequestId = changeRequestId,
            Amount = amount,
            Reason = reason,
            Status = RefundStatus.Pending,
            CreatedAt = now,
        };
        db.Refunds.Add(refund);
        return refund;
    }
}
