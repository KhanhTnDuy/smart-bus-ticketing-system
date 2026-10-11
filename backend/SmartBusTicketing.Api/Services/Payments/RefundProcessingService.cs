using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>
/// Vòng nền tự hoàn tiền (US8): lấy các khoản hoàn đang chờ của giao dịch VNPay và gọi cổng. Khoản tự thử tối đa
/// <see cref="RefundExecutor.MaxAttempts"/> lần với khoảng chờ tăng dần, sau đó chuyển sang xử lý tay. Tắt bằng cấu hình
/// Refunds:AutoProcess; chưa cấu hình VNPay thì không làm gì.
/// </summary>
public sealed class RefundProcessingService(
    IServiceScopeFactory scopes,
    IOptions<RefundOptions> refundOptions,
    VnPayClient vnPay,
    ILogger<RefundProcessingService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(10);
    private const int BatchSize = 10;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                if (refundOptions.Value.AutoProcess && vnPay.Options.IsConfigured)
                {
                    await using var scope = scopes.CreateAsyncScope();
                    await SweepAsync(
                        scope.ServiceProvider.GetRequiredService<AppDbContext>(),
                        scope.ServiceProvider.GetRequiredService<RefundExecutor>(),
                        DateTime.UtcNow, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Vòng tự hoàn tiền thất bại, sẽ thử lại.");
            }
        } while (await WaitNextAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitNextAsync(PeriodicTimer timer, CancellationToken ct)
    {
        try { return await timer.WaitForNextTickAsync(ct); }
        catch (OperationCanceledException) { return false; }
    }

    /// <summary>Một vòng xử lý. Public để kiểm thử gọi trực tiếp. Trả về số khoản đã hoàn thành công.</summary>
    public static async Task<int> SweepAsync(AppDbContext db, RefundExecutor executor, DateTime now, CancellationToken ct)
    {
        // Khoản chưa thử lần nào xử lý ngay; khoản đã thử n lần thì đợi n × RetryStep kể từ lần thử cuối.
        var candidates = await db.Refunds.AsNoTracking()
            .Where(r => r.Status == RefundStatus.Pending
                        && r.Payment.Method == PaymentMethod.VnPay
                        && r.Attempts < RefundExecutor.MaxAttempts)
            .OrderBy(r => r.Id)
            .Select(r => new { r.Id, r.Attempts, r.LastAttemptAt })
            .Take(BatchSize * 3)
            .ToListAsync(ct);

        var done = 0;
        var processed = 0;
        foreach (var c in candidates)
        {
            if (processed >= BatchSize) break;
            if (c.LastAttemptAt is { } last && now - last < c.Attempts * RefundExecutor.RetryStep) continue;

            processed++;
            var result = await executor.ExecuteAsync(c.Id, null, "Hệ thống", manual: false, ct);
            if (result.Outcome == RefundExecution.Succeeded) done++;
        }
        return done;
    }
}
