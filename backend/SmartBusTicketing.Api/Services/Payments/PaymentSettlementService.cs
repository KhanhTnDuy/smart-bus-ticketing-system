using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services.Email;

namespace SmartBusTicketing.Api.Services.Payments;

public enum SettlementOutcome
{
    /// <summary>Thanh toán thành công và lượt đặt đã được xác nhận, vé đã hiệu lực.</summary>
    Confirmed,

    /// <summary>
    /// Cổng đã thu tiền nhưng lượt đặt không còn xác nhận được (hết hạn giữ chỗ hoặc đã có giao dịch khác thanh toán
    /// rồi). Hệ thống tự mở yêu cầu hoàn tiền cho khoản này.
    /// </summary>
    RefundQueued,

    /// <summary>Cổng báo thanh toán không thành công. Lượt đặt vẫn giữ chỗ để khách thử lại.</summary>
    Failed,

    /// <summary>Giao dịch đã được xử lý từ trước (IPN và ReturnUrl cùng về, hoặc cổng gọi lại).</summary>
    AlreadyProcessed,

    InvalidSignature,
    NotFound,
    AmountMismatch,
}

public sealed record SettlementResult(SettlementOutcome Outcome, Payment? Payment, string Message);

/// <summary>
/// Chốt kết quả một giao dịch thanh toán. Dùng chung cho IPN, ReturnUrl và bộ giả lập, và an toàn khi các lời gọi
/// về cùng lúc hoặc lặp lại: mỗi bước chuyển trạng thái là một câu UPDATE có điều kiện, chỉ một lời gọi thấy 1 dòng
/// bị đổi nên chỉ một lời gọi được làm bước tiếp theo.
/// </summary>
public sealed class PaymentSettlementService(
    AppDbContext db, VnPayClient vnPay, AuditLogService audit, IInvoiceMailQueue invoiceMail, ILogger<PaymentSettlementService> logger)
{
    /// <summary>
    /// Xử lý lời gọi từ VNPay (đã gồm bước kiểm chữ ký và đối chiếu số tiền). <paramref name="source"/> cho biết lời gọi đến
    /// từ IPN hay ReturnUrl, chỉ để ghi nhật ký.
    /// </summary>
    public async Task<SettlementResult> SettleVnPayCallbackAsync(IReadOnlyDictionary<string, string> query, CancellationToken ct, string source = "VNPay")
    {
        var callback = vnPay.ParseCallback(query);
        if (callback is null)
        {
            logger.LogWarning("VNPay callback bị từ chối: chữ ký sai hoặc thiếu trường.");
            return new SettlementResult(SettlementOutcome.InvalidSignature, null, "Chữ ký không hợp lệ.");
        }

        var payment = await db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.TxnRef == callback.TxnRef, ct);
        if (payment is null)
            return new SettlementResult(SettlementOutcome.NotFound, null, "Không tìm thấy giao dịch.");

        if (payment.Amount != callback.Amount)
        {
            logger.LogWarning("VNPay callback lệch số tiền cho {TxnRef}: cổng báo {Gateway}, hệ thống {Local}.",
                callback.TxnRef, callback.Amount, payment.Amount);
            return new SettlementResult(SettlementOutcome.AmountMismatch, payment, "Số tiền không khớp.");
        }

        var result = callback.IsSuccess
            ? await SettleSuccessAsync(payment.Id, callback.TransactionNo, callback.PayDate, ct)
            : await SettleFailureAsync(payment.Id, FailureReasonFor(callback.ResponseCode), ct);
        await RecordCallbackAsync(payment.Id, callback, result, source, ct);
        return result;
    }

    /// <summary>Lý do thất bại kèm mã của cổng để tra lại sau, ví dụ "Tài khoản không đủ số dư. (mã VNPay 51)".</summary>
    private static string FailureReasonFor(string responseCode)
    {
        var text = VnPayClient.DescribeResponseCode(responseCode);
        // Mã lạ đã có sẵn "(mã xx)" trong câu mô tả, không thêm lần nữa.
        return text.Contains($"mã {responseCode}", StringComparison.Ordinal) ? text : $"{text.TrimEnd('.')}. (mã VNPay {responseCode})";
    }

    /// <summary>
    /// Ghi nhật ký mọi kết quả VNPay đã qua kiểm chữ ký và số tiền, kể cả kết quả về muộn khi giao dịch đã được chốt hoặc đã hết hạn
    /// (lúc đó SettleFailureAsync không ghi gì). Nhờ vậy sau này tra được cổng đã báo mã nào cho giao dịch nào.
    /// </summary>
    private async Task RecordCallbackAsync(long paymentId, VnPayCallback callback, SettlementResult result, string source, CancellationToken ct)
    {
        var who = await db.Payments.AsNoTracking()
            .Where(p => p.Id == paymentId)
            .Select(p => new { PassengerId = (long?)p.Booking!.PassengerId, Username = p.Booking!.Passenger.Username })
            .FirstOrDefaultAsync(ct);

        var status = callback.IsSuccess ? AuditStatus.Success : AuditStatus.Failure;
        var details = $"Nguồn {source}; mã phản hồi {callback.ResponseCode} ({VnPayClient.DescribeResponseCode(callback.ResponseCode)}); " +
                      $"trạng thái giao dịch {callback.TransactionStatus}; số tiền {callback.Amount:N0} VND; kết quả xử lý: {result.Outcome}";
        await audit.WriteAsync(who?.PassengerId, who?.Username ?? "vnpay", $"Nhận kết quả VNPay {callback.TxnRef}",
            AuditActionType.Payment, $"PAYMENT-{paymentId}", status, details, ct);
    }

    /// <summary>Đánh dấu giao dịch thành công và xác nhận lượt đặt tương ứng.</summary>
    public async Task<SettlementResult> SettleSuccessAsync(long paymentId, string? providerTxnNo, string? gatewayPayDate, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Chốt giao dịch trước: chỉ một lời gọi chuyển được Pending sang Success.
        var claimed = await db.Payments
            .Where(p => p.Id == paymentId && p.Status == PaymentStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PaymentStatus.Success)
                .SetProperty(p => p.ProviderTxnId, providerTxnNo)
                .SetProperty(p => p.GatewayPayDate, gatewayPayDate)
                .SetProperty(p => p.PaidAt, now), ct);
        if (claimed != 1)
        {
            await tx.RollbackAsync(ct);
            var current = await db.Payments.AsNoTracking().FirstAsync(p => p.Id == paymentId, ct);
            return new SettlementResult(SettlementOutcome.AlreadyProcessed, current, "Giao dịch đã được xử lý trước đó.");
        }

        var payment = await db.Payments.Include(p => p.Booking).ThenInclude(b => b!.Passenger).FirstAsync(p => p.Id == paymentId, ct);
        var booking = payment.Booking!;

        // Lượt đặt chỉ xác nhận được khi còn Pending và còn trong thời hạn giữ chỗ.
        var confirmed = await db.Bookings
            .Where(b => b.Id == booking.Id && b.Status == BookingStatus.Pending && b.HoldExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Confirmed), ct);

        if (confirmed != 1)
        {
            // Tiền đã vào nhưng không còn vé để giao: mở yêu cầu hoàn tiền thay vì để khách mất tiền không có vé.
            db.Refunds.Add(new Refund
            {
                PaymentId = payment.Id,
                Amount = payment.Amount,
                Reason = RefundReason.PaymentFailed,
                Status = RefundStatus.Pending,
                CreatedAt = now,
                Note = "Tự động: thanh toán về sau khi lượt đặt đã hết hạn giữ chỗ hoặc đã được thanh toán bởi giao dịch khác.",
            });
            NotificationRules.Notify(db, booking.PassengerId, NotificationType.Other, "Thanh toán chưa thể xuất vé",
                $"Đã nhận {payment.Amount:N0} đ cho lượt đặt {booking.BookingCode} nhưng lượt đặt đã hết hạn giữ chỗ. Khoản này sẽ được hoàn lại.",
                "/passenger/payments", booking.TripId);
            await NotificationRules.NotifyManagementAsync(db, "Hoàn tiền thanh toán trễ",
                $"Cần hoàn {payment.Amount:N0} đ cho lượt đặt {booking.BookingCode}: thanh toán về sau khi hết hạn giữ chỗ.",
                "/manager/refunds", null, ct, booking.TripId);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            await audit.WriteAsync(booking.PassengerId, booking.Passenger.Username, $"Thanh toán trễ {booking.BookingCode}",
                AuditActionType.Payment, $"PAYMENT-{payment.Id}", AuditStatus.Warning,
                $"{payment.Amount:N0} VND về sau khi hết hạn giữ chỗ, đã mở yêu cầu hoàn tiền.", ct);
            return new SettlementResult(SettlementOutcome.RefundQueued, payment,
                "Đã nhận tiền nhưng lượt đặt đã hết hạn giữ chỗ. Khoản này sẽ được hoàn lại.");
        }

        db.Invoices.Add(new Invoice
        {
            PaymentId = payment.Id,
            InvoiceNo = $"INV-{now:yyyyMMdd}-{payment.Id:D6}",
            Email = booking.Passenger.Email ?? string.Empty,
            Total = payment.Amount,
        });
        await db.Tickets
            .Where(t => t.BookingId == booking.Id && t.Status == TicketStatus.Held)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Status, TicketStatus.Valid), ct);
        NotificationRules.Notify(db, booking.PassengerId, NotificationType.Other, "Thanh toán thành công",
            $"Đã thanh toán {payment.Amount:N0} đ cho lượt đặt {booking.BookingCode}. Vé điện tử đã sẵn sàng.",
            "/passenger/tickets", booking.TripId);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        // Gửi email hóa đơn trong nền: lỗi SMTP không ảnh hưởng giao dịch đã chốt.
        invoiceMail.Signal();

        await audit.WriteAsync(booking.PassengerId, booking.Passenger.Username, $"Thanh toán {booking.BookingCode}",
            AuditActionType.Payment, $"PAYMENT-{payment.Id}", AuditStatus.Success,
            $"{payment.Method}, {payment.Amount:N0} VND, giao dịch {providerTxnNo}", ct);
        return new SettlementResult(SettlementOutcome.Confirmed, payment, "Thanh toán thành công.");
    }

    /// <summary>Đánh dấu giao dịch thất bại. Lượt đặt giữ nguyên để khách thanh toán lại trong thời hạn giữ chỗ.</summary>
    public async Task<SettlementResult> SettleFailureAsync(long paymentId, string reason, CancellationToken ct)
    {
        var updated = await db.Payments
            .Where(p => p.Id == paymentId && p.Status == PaymentStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PaymentStatus.Failed)
                .SetProperty(p => p.FailureReason, reason), ct);

        var payment = await db.Payments.AsNoTracking().Include(p => p.Booking).ThenInclude(b => b!.Passenger)
            .FirstAsync(p => p.Id == paymentId, ct);
        if (updated != 1)
            return new SettlementResult(SettlementOutcome.AlreadyProcessed, payment, "Giao dịch đã được xử lý trước đó.");

        var booking = payment.Booking!;
        await audit.WriteAsync(booking.PassengerId, booking.Passenger.Username, $"Thanh toán thất bại {booking.BookingCode}",
            AuditActionType.Payment, $"PAYMENT-{payment.Id}", AuditStatus.Failure, reason, ct);
        return new SettlementResult(SettlementOutcome.Failed, payment, reason);
    }
}
