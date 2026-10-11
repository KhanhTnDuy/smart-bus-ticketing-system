using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services.Payments;

public enum RefundExecution
{
    /// <summary>VNPay đã hoàn tiền và khoản hoàn đã chuyển sang Success.</summary>
    Succeeded,

    /// <summary>Khoản hoàn đã được xử lý (hoặc đang được bên khác xử lý), không làm gì thêm.</summary>
    AlreadyProcessed,

    /// <summary>Lỗi tạm thời (mạng, hết thời gian chờ, cổng báo lỗi hệ thống): sẽ thử lại.</summary>
    Retry,

    /// <summary>Cổng từ chối hoặc kết quả không chắc chắn: dừng tự động, quản lý phải đối soát và xử lý tay.</summary>
    NeedsManual,

    /// <summary>Khoản hoàn không thuộc giao dịch qua cổng (giả lập): không có gì để gọi.</summary>
    NotGatewayRefund,
}

public sealed record RefundExecutionResult(RefundExecution Outcome, string Message);

/// <summary>
/// Thực hiện một khoản hoàn tiền qua API hoàn tiền của VNPay rồi chốt kết quả. Dùng cho cả vòng tự động
/// (RefundProcessingService) và nút duyệt của quản lý. Mỗi lần gọi "nhận" khoản hoàn bằng một câu UPDATE có điều kiện
/// nên hai bên không bao giờ cùng gọi cổng cho một khoản.
///
/// An toàn tiền: mã yêu cầu gửi cổng cố định theo khoản hoàn (RF{id}) để VNPay chặn yêu cầu trùng. Nếu cổng báo trùng
/// hoặc kết quả không rõ thì KHÔNG coi là thành công cũng không thử lại, mà chuyển sang xử lý tay để đối soát, tránh
/// hoàn hai lần hoặc báo hoàn mà thực tế chưa hoàn.
/// </summary>
public sealed class RefundExecutor(
    AppDbContext db, IVnPayRefundGateway gateway, VnPayClient vnPay, AuditLogService audit, ILogger<RefundExecutor> logger)
{
    /// <summary>Số lần tự thử tối đa trước khi chuyển sang xử lý tay.</summary>
    public const int MaxAttempts = 5;

    /// <summary>Khoảng chờ giữa các lần thử: lần thứ n chờ n × giá trị này.</summary>
    public static readonly TimeSpan RetryStep = TimeSpan.FromSeconds(30);

    public static bool IsGatewayMethod(PaymentMethod method) => method == PaymentMethod.VnPay;

    public async Task<RefundExecutionResult> ExecuteAsync(
        long refundId, long? actorId, string actorName, bool manual, CancellationToken ct)
    {
        var info = await db.Refunds.AsNoTracking()
            .Where(r => r.Id == refundId)
            .Select(r => new
            {
                r.Id, r.Status, r.Attempts, r.Amount, r.PaymentId,
                Method = r.Payment.Method,
                PaymentAmount = r.Payment.Amount,
                r.Payment.TxnRef,
                r.Payment.ProviderTxnId,
                r.Payment.GatewayCreateDate,
                r.Payment.GatewayPayDate,
                PassengerId = r.Payment.Booking!.PassengerId,
                BookingCode = r.Payment.Booking.BookingCode,
                PriorRefunded = r.Payment.Refunds.Where(x => x.Status == RefundStatus.Success && x.Id != r.Id).Sum(x => (decimal?)x.Amount) ?? 0,
            })
            .FirstOrDefaultAsync(ct);

        if (info is null || info.Status != RefundStatus.Pending)
            return new RefundExecutionResult(RefundExecution.AlreadyProcessed, "Khoản hoàn này đã được xử lý.");
        if (!IsGatewayMethod(info.Method))
            return new RefundExecutionResult(RefundExecution.NotGatewayRefund, "Khoản hoàn không thuộc giao dịch qua cổng thanh toán.");
        if (!vnPay.Options.IsConfigured)
            return new RefundExecutionResult(RefundExecution.NeedsManual, "Chưa cấu hình cổng VNPay trên máy chủ nên không hoàn tự động được.");
        if (string.IsNullOrEmpty(info.TxnRef) || string.IsNullOrEmpty(info.ProviderTxnId))
            return await NeedsManualAsync(refundId, info.PassengerId, info.BookingCode,
                "Giao dịch gốc thiếu mã tham chiếu của VNPay, cần hoàn thủ công.", ct);

        // Nhận khoản hoàn: chỉ một bên thấy 1 dòng bị đổi. Quản lý duyệt tay (manual) không bị giới hạn số lần tự thử.
        var attemptNow = DateTime.UtcNow;
        var claimed = await db.Refunds
            .Where(r => r.Id == refundId && r.Status == RefundStatus.Pending && r.Attempts == info.Attempts
                        && (manual || r.Attempts < MaxAttempts))
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Attempts, r => r.Attempts + 1)
                .SetProperty(r => r.LastAttemptAt, attemptNow), ct);
        if (claimed != 1)
            return new RefundExecutionResult(RefundExecution.AlreadyProcessed, "Khoản hoàn này đang được xử lý hoặc đã quá số lần tự thử.");

        var dateSource = string.Equals(vnPay.Options.RefundDateSource, "Pay", StringComparison.OrdinalIgnoreCase)
            ? info.GatewayPayDate
            : info.GatewayCreateDate;
        // Hoàn toàn bộ (02) khi khoản này bằng tiền giao dịch và chưa hoàn khoản nào; còn lại là hoàn một phần (03).
        var full = info.Amount == info.PaymentAmount && info.PriorRefunded == 0;

        VnPayRefundResponse response;
        try
        {
            response = await gateway.RefundAsync(new VnPayRefundRequest(
                $"RF{refundId}", info.TxnRef, info.Amount, full, info.ProviderTxnId, dateSource ?? string.Empty,
                $"Hoan tien ve {info.BookingCode}", actorName), ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or System.Text.Json.JsonException)
        {
            logger.LogWarning(ex, "Gọi API hoàn tiền VNPay cho khoản hoàn #{RefundId} lỗi (lần {Attempt}).", refundId, info.Attempts + 1);
            return await RetryOrGiveUpAsync(refundId, info.Attempts + 1, info.PassengerId, info.BookingCode,
                "Không kết nối được tới VNPay: " + ex.Message, ct);
        }

        if (!response.SignatureValid)
            return await NeedsManualAsync(refundId, info.PassengerId, info.BookingCode,
                $"Phản hồi của VNPay sai chữ ký (mã {response.ResponseCode}), chưa rõ đã hoàn hay chưa. Đối soát với VNPay trước khi xử lý.", ct);

        if (response.ResponseCode == "00")
            return await FinalizeSuccessAsync(refundId, info.PaymentId, info.PassengerId, info.BookingCode, info.Amount,
                response.TransactionNo, actorId, actorName, ct);

        // 99 = lỗi không xác định phía VNPay, có thể tự hết: thử lại. Mọi mã khác (không tìm thấy giao dịch, số tiền sai,
        // yêu cầu trùng 94, không cho hoàn...) là quyết định của cổng, thử lại không đổi được: chuyển xử lý tay.
        if (response.ResponseCode == "99")
            return await RetryOrGiveUpAsync(refundId, info.Attempts + 1, info.PassengerId, info.BookingCode,
                $"VNPay báo lỗi tạm thời (99): {response.Message}", ct);

        return await NeedsManualAsync(refundId, info.PassengerId, info.BookingCode,
            $"VNPay từ chối hoàn tiền (mã {response.ResponseCode}): {response.Message}", ct);
    }

    private async Task<RefundExecutionResult> FinalizeSuccessAsync(
        long refundId, long paymentId, long passengerId, string bookingCode, decimal amount,
        string? gatewayRefId, long? actorId, string actorName, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var note = actorId is null
            ? "Hoàn tự động qua VNPay."
            : $"Hoàn qua VNPay do {actorName} duyệt.";

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var updated = await db.Refunds
            .Where(r => r.Id == refundId && r.Status == RefundStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, RefundStatus.Success)
                .SetProperty(r => r.ProcessedAt, now)
                .SetProperty(r => r.ProcessedBy, actorId)
                .SetProperty(r => r.GatewayRefId, gatewayRefId)
                .SetProperty(r => r.Note, note), ct);
        if (updated != 1)
        {
            await tx.RollbackAsync(ct);
            return new RefundExecutionResult(RefundExecution.AlreadyProcessed, "Khoản hoàn này đã được xử lý.");
        }

        var payment = await db.Payments.Include(p => p.Refunds).FirstAsync(p => p.Id == paymentId, ct);
        var refunded = payment.Refunds.Where(r => r.Status == RefundStatus.Success).Sum(r => r.Amount);
        if (refunded >= payment.Amount && payment.Status == PaymentStatus.Success)
            payment.Status = PaymentStatus.Refunded;

        NotificationRules.Notify(db, passengerId, NotificationType.Other, "Đã hoàn tiền",
            $"Bạn đã được hoàn {amount:N0} đ về phương thức thanh toán ban đầu (đặt chỗ {bookingCode}).", "/passenger/payments");
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await audit.WriteAsync(actorId, actorName, $"Hoàn tiền #{refundId} qua VNPay", AuditActionType.Payment,
            $"REFUND-{refundId}", AuditStatus.Success, $"{amount:N0} VND, mã hoàn {gatewayRefId}", ct);
        return new RefundExecutionResult(RefundExecution.Succeeded, "Đã hoàn tiền qua VNPay.");
    }

    private static string Truncate(string text) => text.Length > 1900 ? text[..1900] : text;

    /// <summary>Lỗi tạm thời: ghi lý do và để vòng sau thử lại; hết số lần thì chuyển xử lý tay.</summary>
    private async Task<RefundExecutionResult> RetryOrGiveUpAsync(
        long refundId, int attemptsSoFar, long passengerId, string bookingCode, string reason, CancellationToken ct)
    {
        if (attemptsSoFar >= MaxAttempts)
            return await NeedsManualAsync(refundId, passengerId, bookingCode, $"Đã thử {attemptsSoFar} lần không được. {reason}", ct);

        var note = Truncate($"Lần {attemptsSoFar}/{MaxAttempts}: {reason}");
        await db.Refunds.Where(r => r.Id == refundId && r.Status == RefundStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Note, note), ct);
        return new RefundExecutionResult(RefundExecution.Retry, reason);
    }

    /// <summary>Dừng tự động: đặt số lần thử về tối đa để vòng nền bỏ qua, ghi lý do và báo quản lý.</summary>
    private async Task<RefundExecutionResult> NeedsManualAsync(
        long refundId, long passengerId, string bookingCode, string reason, CancellationToken ct)
    {
        var note = Truncate("Cần xử lý tay: " + reason);
        var updated = await db.Refunds.Where(r => r.Id == refundId && r.Status == RefundStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Attempts, MaxAttempts)
                .SetProperty(r => r.Note, note), ct);
        if (updated == 1)
        {
            await NotificationRules.NotifyManagementAsync(db, "Hoàn tiền cần xử lý tay",
                $"Khoản hoàn của lượt đặt {bookingCode} không tự hoàn được: {reason}", "/manager/refunds", null, ct);
            await db.SaveChangesAsync(ct);
        }
        logger.LogWarning("Khoản hoàn #{RefundId} chuyển xử lý tay: {Reason}", refundId, reason);
        return new RefundExecutionResult(RefundExecution.NeedsManual, reason);
    }
}
