using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// Dọn các lượt giữ chỗ quá 10 phút mà không ai thanh toán: lượt đặt sang Expired, vé Held sang Expired (nhả ghế),
/// và các giao dịch còn chờ của lượt đặt đó sang Failed.
///
/// SeatHoldService vẫn nhả ghế "lười" khi có người đặt đúng ghế đó, nhưng nếu không có ai đặt lại thì lượt đặt
/// treo ở Pending mãi và số liệu báo cáo, thông báo hiển thị sai. Việc dọn này chỉ làm đúng điều kiện đã quá hạn,
/// loại trừ lẫn nhau với bước xác nhận của PaymentSettlementService (nó chỉ xác nhận khi HoldExpiresAt còn ở tương lai).
/// </summary>
public sealed class HoldExpiryService(IServiceScopeFactory scopes, ILogger<HoldExpiryService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);

    /// <summary>
    /// Giao dịch VNPay còn chờ được giữ thêm một lúc sau khi hết hạn giữ chỗ: VNPay tự chặn thanh toán sau
    /// vnp_ExpireDate, nhưng IPN có thể về chậm nên đừng đánh dấu Failed quá sớm.
    /// </summary>
    private static readonly TimeSpan PendingPaymentGrace = TimeSpan.FromMinutes(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await SweepAsync(db, DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                // Lỗi tạm thời (mất kết nối DB...) không được làm dừng dịch vụ nền: vòng sau thử lại.
                logger.LogError(ex, "Dọn lượt giữ chỗ hết hạn thất bại, sẽ thử lại sau {Seconds}s.", Interval.TotalSeconds);
            }
        } while (await WaitNextAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitNextAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try { return await timer.WaitForNextTickAsync(ct); }
        catch (OperationCanceledException) { return false; }
    }

    /// <summary>Một lượt dọn. Tách ra public để kiểm thử gọi trực tiếp mà không cần chờ bộ hẹn giờ.</summary>
    public static async Task<(int Bookings, int Tickets, int Payments)> SweepAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var expiredIds = await db.Bookings
            .Where(b => b.Status == BookingStatus.Pending && b.HoldExpiresAt <= now)
            .OrderBy(b => b.Id)
            .Select(b => b.Id)
            .Take(500)
            .ToListAsync(ct);

        var bookings = 0;
        var tickets = 0;
        if (expiredIds.Count > 0)
        {
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            // Điều kiện Pending và quá hạn được lặp lại trong UPDATE để không đè lên lượt đặt vừa được xác nhận.
            bookings = await db.Bookings
                .Where(b => expiredIds.Contains(b.Id) && b.Status == BookingStatus.Pending && b.HoldExpiresAt <= now)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Expired), ct);
            tickets = await db.Tickets
                .Where(t => expiredIds.Contains(t.BookingId) && t.Status == TicketStatus.Held && t.Booking.Status == BookingStatus.Expired)
                .ExecuteUpdateAsync(s => s.SetProperty(t => t.Status, TicketStatus.Expired), ct);
            await tx.CommitAsync(ct);
        }

        var cutoff = now - PendingPaymentGrace;
        var payments = await db.Payments
            .Where(p => p.Status == PaymentStatus.Pending && p.Booking!.HoldExpiresAt <= cutoff)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PaymentStatus.Failed)
                .SetProperty(p => p.FailureReason, "Hết thời gian chờ thanh toán."), ct);

        return (bookings, tickets, payments);
    }
}
