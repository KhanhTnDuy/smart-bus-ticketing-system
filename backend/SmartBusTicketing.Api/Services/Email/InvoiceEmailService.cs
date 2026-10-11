using System.Threading.Channels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services.Email;

/// <summary>Báo cho dịch vụ gửi mail biết có hóa đơn mới cần gửi, để gửi ngay thay vì chờ vòng quét kế tiếp.</summary>
public interface IInvoiceMailQueue
{
    void Signal();
}

/// <summary>
/// Gửi hóa đơn điện tử qua email trong nền, tách khỏi luồng thanh toán: lỗi SMTP không bao giờ làm hỏng hay làm chậm
/// việc chốt giao dịch. Mỗi vòng quét lấy các hóa đơn chưa gửi (SentAt rỗng, có địa chỉ, chưa quá số lần thử), "nhận"
/// từng hóa đơn bằng một câu UPDATE có điều kiện nên không gửi trùng dù có nhiều tiến trình hoặc khách bấm gửi lại.
/// Chưa cấu hình email thì không làm gì và không tính là thất bại: hóa đơn nằm chờ tới khi bật cấu hình.
/// </summary>
public sealed class InvoiceEmailService(
    IServiceScopeFactory scopes,
    IEmailSender sender,
    IOptions<EmailOptions> options,
    ILogger<InvoiceEmailService> logger) : BackgroundService, IInvoiceMailQueue
{
    public const int MaxAttempts = 5;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(60);
    private const int BatchSize = 20;

    private readonly Channel<bool> signals = Channel.CreateBounded<bool>(
        new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public void Signal() => signals.Writer.TryWrite(true);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await SweepAsync(db, sender, options.Value, logger, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Quét hóa đơn chờ gửi email thất bại, sẽ thử lại.");
            }

            // Chờ tín hiệu có hóa đơn mới hoặc hết chu kỳ.
            using var wait = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
            wait.CancelAfter(Interval);
            try { await signals.Reader.ReadAsync(wait.Token); }
            catch (OperationCanceledException) { /* hết chu kỳ hoặc đang dừng */ }
        }
    }

    /// <summary>Một vòng quét. Public để kiểm thử gọi trực tiếp. Trả về số email gửi thành công.</summary>
    public static async Task<int> SweepAsync(
        AppDbContext db, IEmailSender sender, EmailOptions options, ILogger logger, CancellationToken ct)
    {
        if (!sender.IsConfigured) return 0;

        var candidates = await db.Invoices.AsNoTracking()
            .Where(i => i.SentAt == null && i.Email != "" && i.EmailAttempts < MaxAttempts
                        && i.Payment.Status != PaymentStatus.Failed)
            .OrderBy(i => i.Id)
            .Select(i => new { i.Id, i.EmailAttempts })
            .Take(BatchSize)
            .ToListAsync(ct);

        var sent = 0;
        foreach (var c in candidates)
        {
            // Nhận hóa đơn: chỉ một bên thấy 1 dòng bị đổi nên chỉ một bên được gửi.
            var claimed = await db.Invoices
                .Where(i => i.Id == c.Id && i.SentAt == null && i.EmailAttempts == c.EmailAttempts)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.EmailAttempts, i => i.EmailAttempts + 1), ct);
            if (claimed != 1) continue;

            try
            {
                var model = await LoadModelAsync(db, c.Id, options, ct);
                if (model is null) continue;
                await sender.SendAsync(model.Value.To, InvoiceEmailBuilder.Subject(model.Value.Model),
                    InvoiceEmailBuilder.Html(model.Value.Model), ct);

                var now = DateTime.UtcNow;
                await db.Invoices.Where(i => i.Id == c.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(i => i.SentAt, now).SetProperty(i => i.EmailError, (string?)null), ct);
                sent++;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Lưu lý do (cắt ngắn) để quản trị viên xem; không trả chi tiết SMTP ra API cho khách.
                logger.LogWarning(ex, "Gửi email hóa đơn #{InvoiceId} thất bại (lần {Attempt}/{Max}).", c.Id, c.EmailAttempts + 1, MaxAttempts);
                var reason = ex.Message.Length > 250 ? ex.Message[..250] : ex.Message;
                await db.Invoices.Where(i => i.Id == c.Id)
                    .ExecuteUpdateAsync(s => s.SetProperty(i => i.EmailError, reason), CancellationToken.None);
            }
        }
        return sent;
    }

    private static async Task<(string To, InvoiceEmailModel Model)?> LoadModelAsync(
        AppDbContext db, long invoiceId, EmailOptions options, CancellationToken ct)
    {
        var row = await db.Invoices.AsNoTracking()
            .Where(i => i.Id == invoiceId)
            .Select(i => new
            {
                i.InvoiceNo,
                i.Email,
                i.Total,
                Method = i.Payment.Method,
                PaidAt = i.Payment.PaidAt,
                Passenger = i.Payment.Booking!.Passenger.FullName,
                BookingCode = i.Payment.Booking.BookingCode,
                RouteCode = i.Payment.Booking.Trip.BusRoute.Code,
                RouteName = i.Payment.Booking.Trip.BusRoute.Name,
                DepartureAt = i.Payment.Booking.Trip.DepartureAt,
                Seats = i.Payment.Booking.Tickets.Where(t => t.Status != TicketStatus.Exchanged)
                    .Select(t => t.Seat.SeatCode).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (row is null) return null;

        var model = new InvoiceEmailModel(
            row.InvoiceNo, row.Passenger, row.BookingCode, row.RouteCode, row.RouteName, row.DepartureAt,
            row.Seats, MethodLabel(row.Method), row.Total, row.PaidAt,
            $"{options.FrontendBaseUrl.TrimEnd('/')}/passenger/tickets");
        return (row.Email, model);
    }

    private static string MethodLabel(PaymentMethod method) => method switch
    {
        PaymentMethod.VnPay => "VNPay",
        PaymentMethod.Momo => "Ví MoMo",
        PaymentMethod.ZaloPay => "Ví ZaloPay",
        PaymentMethod.Card => "Thẻ ngân hàng",
        PaymentMethod.BankTransfer => "Chuyển khoản ngân hàng",
        _ => method.ToString(),
    };
}
