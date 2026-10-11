using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using Microsoft.Extensions.Options;
using SmartBusTicketing.Api.Services;
using SmartBusTicketing.Api.Services.Email;
using SmartBusTicketing.Api.Services.Payments;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Thanh toán vé qua cổng VNPay (sandbox hoặc thật): giao dịch tạo ở trạng thái Pending, khách sang trang của
/// ngân hàng, rồi IPN/ReturnUrl chốt kết quả ở PaymentSettlementService. Số tiền lấy từ Booking.FinalAmount ở máy
/// chủ, không nhận từ client. Các phương thức khác (MoMo, ZaloPay...) chỉ chạy bằng bộ giả lập khi bật cấu hình
/// Payments:Simulator:Enabled, và dùng cùng đường chốt giao dịch với VNPay.
/// </summary>
[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController(
    AppDbContext db, PaymentSettlementService settlement, VnPayClient vnPay, IConfiguration config,
    IOptions<BankTransferOptions> bankOptions, AuditLogService audit) : ControllerBase
{
    private readonly BankTransferOptions bank = bankOptions.Value;

    /// <summary>Bộ giả lập cho các phương thức chưa nối cổng thật. Phải tắt ở môi trường thật.</summary>
    private readonly bool simulatorEnabled = config.GetValue<bool>("Payments:Simulator:Enabled");

    private Dictionary<string, string> QueryToDictionary() =>
        Request.Query.ToDictionary(kv => kv.Key, kv => kv.Value.ToString(), StringComparer.Ordinal);

    private static IQueryable<PaymentDto> Project(IQueryable<Payment> q) => q.Select(p => new PaymentDto
    {
        Id = p.Id,
        BookingId = p.BookingId!.Value,
        BookingCode = p.Booking!.BookingCode,
        PassengerId = p.Booking.PassengerId,
        PassengerName = p.Booking.Passenger.FullName,
        Method = p.Method.ToString(),
        Amount = p.Amount,
        Status = p.Status.ToString(),
        ProviderTxnId = p.ProviderTxnId,
        FailureReason = p.FailureReason,
        Reference = p.TxnRef,
        HoldExpiresAt = p.Booking.HoldExpiresAt,
        PaidAt = p.PaidAt,
        TripId = p.Booking.TripId,
        RouteCode = p.Booking.Trip.BusRoute.Code,
        RouteName = p.Booking.Trip.BusRoute.Name,
        DepartureAt = p.Booking.Trip.DepartureAt,
        Seats = p.Booking.Tickets.Where(t => t.Status != TicketStatus.Exchanged).Select(t => t.Seat.SeatCode).ToList(),
        InvoiceId = p.Invoice != null ? p.Invoice.Id : null,
        InvoiceNo = p.Invoice != null ? p.Invoice.InvoiceNo : null,
        RefundedAmount = p.Refunds.Where(r => r.Status == RefundStatus.Success).Sum(r => (decimal?)r.Amount) ?? 0,
        Refunds = p.Refunds.OrderBy(r => r.Id).Select(r => new RefundSummaryDto
        {
            Id = r.Id,
            Amount = r.Amount,
            Status = r.Status.ToString(),
            Reason = r.Reason.ToString(),
            CreatedAt = r.CreatedAt,
            ProcessedAt = r.ProcessedAt,
            Note = r.Note,
        }).ToList(),
    });

    /// <summary>
    /// Bắt đầu thanh toán một lượt đặt đang giữ chỗ của chính hành khách đăng nhập. Với VNPay, tạo giao dịch ở
    /// trạng thái Pending và trả về PaymentUrl để trình duyệt chuyển sang trang thanh toán của ngân hàng; lượt
    /// đặt chỉ được xác nhận khi VNPay báo thành công (IPN hoặc ReturnUrl). Khách có thể gọi lại để thử lại sau
    /// khi một lần thanh toán thất bại, miễn là còn trong thời hạn giữ chỗ.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<PaymentDto>> Pay(PayBookingRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        if (!Enum.IsDefined(request.Method))
            return BadRequest(new { message = "Phương thức thanh toán không hợp lệ." });

        var useVnPay = request.Method == PaymentMethod.VnPay;
        var useTransfer = request.Method == PaymentMethod.BankTransfer;
        if (useVnPay && !vnPay.Options.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Cổng VNPay chưa được cấu hình trên máy chủ (thiếu Payments:VnPay:TmnCode/HashSecret)." });
        if (useTransfer && !bank.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Chưa cấu hình tài khoản nhận chuyển khoản trên máy chủ (mục BankTransfer)." });
        if (!useVnPay && !useTransfer && !simulatorEnabled)
            return BadRequest(new { message = "Phương thức này chưa được hỗ trợ. Vui lòng chọn chuyển khoản ngân hàng hoặc VNPay." });

        var booking = await db.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.PassengerId == actorId, ct);
        if (booking is null) return NotFound(new { message = "Không tìm thấy lượt đặt vé của bạn." });

        if (booking.Status == BookingStatus.Confirmed)
            return Conflict(new { message = "Lượt đặt này đã được thanh toán." });
        if (booking.Status != BookingStatus.Pending)
            return Conflict(new { message = "Lượt đặt này đã bị hủy hoặc hết hạn giữ chỗ, không thể thanh toán." });
        if (booking.FinalAmount <= 0)
            return BadRequest(new { message = "Lượt đặt không có số tiền cần thanh toán." });

        var now = DateTime.UtcNow;
        // Cần tối thiểu vài phút để khách kịp nhập thẻ; gần hết hạn thì bắt đặt lại thay vì để thanh toán dở dang.
        if (booking.HoldExpiresAt <= now.AddMinutes(1))
            return Conflict(new { message = "Lượt đặt sắp hết thời gian giữ chỗ, vui lòng đặt vé lại." });

        var prefix = useVnPay ? vnPay.Options.TxnRefPrefix : "SIM";
        var payment = new Payment
        {
            BookingId = booking.Id,
            Method = request.Method,
            Amount = booking.FinalAmount,
            Status = PaymentStatus.Pending,
            // Chuyển khoản: mã tham chiếu chính là nội dung khách phải ghi khi chuyển tiền.
            TxnRef = useTransfer
                ? BankTransferHelper.NewMemo(bank.MemoPrefix)
                : $"{prefix}{now:yyMMddHHmmss}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            GatewayCreateDate = useVnPay ? VnPayClient.FormatVnTime(now) : null,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);

        string? paymentUrl = null;
        if (useVnPay)
        {
            var expire = booking.HoldExpiresAt < now.AddMinutes(15) ? booking.HoldExpiresAt : now.AddMinutes(15);
            paymentUrl = vnPay.BuildPaymentUrl(
                payment.TxnRef!, payment.Amount, $"Thanh toan ve {booking.BookingCode}",
                HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "127.0.0.1", now, expire);
        }
        else if (!useTransfer)
        {
            // Bộ giả lập (chỉ dùng khi dev): thanh toán luôn thành công, đi qua đúng đường chốt giao dịch thật.
            var simulated = await settlement.SettleSuccessAsync(payment.Id,
                $"SIM-{request.Method.ToString().ToUpperInvariant()}-{Guid.NewGuid().ToString("N")[..12].ToUpperInvariant()}",
                VnPayClient.FormatVnTime(now), ct);
            if (simulated.Outcome != SettlementOutcome.Confirmed)
                return Conflict(new { message = simulated.Message });
        }

        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == payment.Id)).FirstAsync(ct);
        dto.PaymentUrl = paymentUrl;
        WithTransfer(dto);
        return CreatedAtAction(nameof(Get), new { id = payment.Id }, dto);
    }

    /// <summary>Gắn thông tin chuyển khoản (mã VietQR, tài khoản, nội dung) cho giao dịch chuyển khoản còn chờ.</summary>
    private PaymentDto WithTransfer(PaymentDto dto)
    {
        if (dto.Method == nameof(PaymentMethod.BankTransfer) && dto.Status == nameof(PaymentStatus.Pending)
            && bank.IsConfigured && !string.IsNullOrEmpty(dto.Reference))
        {
            dto.Transfer = new BankTransferInfoDto
            {
                BankId = bank.BankId,
                BankName = string.IsNullOrWhiteSpace(bank.BankName) ? bank.BankId : bank.BankName,
                AccountNumber = bank.AccountNumber,
                AccountName = bank.AccountName,
                Amount = dto.Amount,
                Memo = dto.Reference,
                QrUrl = BankTransferHelper.QrUrl(bank, dto.Amount, dto.Reference),
                ExpiresAt = dto.HoldExpiresAt,
            };
        }
        return dto;
    }

    /// <summary>
    /// Giao dịch chuyển khoản đã bị đánh Failed vì quá hạn chờ nhưng tiền vẫn có thể về: mở lại thành Pending để xác nhận được.
    /// Chỉ mở lại khi lý do là hết hạn chờ, không đụng tới giao dịch thất bại vì lý do khác.
    /// </summary>
    private Task<int> ReopenTimedOutTransferAsync(long paymentId, CancellationToken ct) =>
        db.Payments
            .Where(p => p.Id == paymentId && p.Method == PaymentMethod.BankTransfer && p.Status == PaymentStatus.Failed
                        && p.FailureReason == HoldExpiryService.TimeoutReason)
            .ExecuteUpdateAsync(s => s
                .SetProperty(p => p.Status, PaymentStatus.Pending)
                .SetProperty(p => p.FailureReason, (string?)null), ct);

    /// <summary>
    /// Quản lý xác nhận đã nhận tiền chuyển khoản (đối chiếu sao kê). Chốt giao dịch cùng đường với VNPay: lượt đặt được xác nhận,
    /// vé có hiệu lực, hóa đơn được tạo. Nếu lượt đặt đã hết hạn giữ chỗ thì tiền đã vào nhưng không xuất vé: hệ thống mở yêu cầu hoàn tiền.
    /// </summary>
    [HttpPost("{id:long}/confirm-transfer")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<PaymentResultDto>> ConfirmTransfer(long id, ConfirmTransferRequest request, CancellationToken ct)
    {
        var info = await db.Payments.AsNoTracking().Where(p => p.Id == id)
            .Select(p => new { p.Method, p.Status }).FirstOrDefaultAsync(ct);
        if (info is null) return NotFound();
        if (info.Method != PaymentMethod.BankTransfer)
            return BadRequest(new { message = "Chỉ xác nhận thủ công được giao dịch chuyển khoản ngân hàng." });
        if (info.Status is PaymentStatus.Success or PaymentStatus.Refunded)
            return Conflict(new { message = "Giao dịch này đã được xác nhận." });

        var bankTxn = string.IsNullOrWhiteSpace(request.BankTransactionId) ? $"MANUAL-{id}" : request.BankTransactionId.Trim();
        if (await db.Payments.AnyAsync(p => p.ProviderTxnId == bankTxn && p.Id != id, ct))
            return Conflict(new { message = "Mã giao dịch ngân hàng này đã được dùng cho giao dịch khác." });

        await ReopenTimedOutTransferAsync(id, ct);
        var result = await settlement.SettleSuccessAsync(id, bankTxn, VnPayClient.FormatVnTime(DateTime.UtcNow), ct);
        if (result.Outcome == SettlementOutcome.AlreadyProcessed)
            return Conflict(new { message = "Giao dịch này không còn ở trạng thái chờ nên không xác nhận được." });

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "manager", $"Xác nhận chuyển khoản #{id}",
            AuditActionType.Payment, $"PAYMENT-{id}", AuditStatus.Success, $"Mã giao dịch ngân hàng {bankTxn}", ct);

        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == id)).FirstAsync(ct);
        var ok = result.Outcome == SettlementOutcome.Confirmed;
        return Ok(new PaymentResultDto { Success = ok, Message = ok ? "Đã xác nhận nhận tiền, vé đã có hiệu lực." : result.Message, Payment = dto });
    }

    /// <summary>
    /// Webhook báo có tiền vào tài khoản (định dạng SePay): tự xác nhận giao dịch chuyển khoản khi nội dung chứa đúng mã và số tiền khớp.
    /// Bảo vệ bằng khóa API trong header "Authorization: Apikey ...". Luôn trả 200 cho khoản tiền không khớp (kèm matched=false) để
    /// dịch vụ gửi webhook không gửi lại mãi; khoản lệch số tiền được báo cho quản lý đối soát.
    /// </summary>
    [HttpPost("bank-transfer/webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> BankTransferWebhook([FromBody] System.Text.Json.JsonElement body, CancellationToken ct)
    {
        if (!bank.WebhookEnabled) return NotFound();

        var expectedAuth = System.Text.Encoding.UTF8.GetBytes("Apikey " + bank.WebhookApiKey);
        var actualAuth = System.Text.Encoding.UTF8.GetBytes(Request.Headers.Authorization.ToString());
        if (expectedAuth.Length != actualAuth.Length
            || !System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(expectedAuth, actualAuth))
            return Unauthorized(new { success = false });

        string Str(string name) => body.ValueKind == System.Text.Json.JsonValueKind.Object
            && body.TryGetProperty(name, out var v) && v.ValueKind != System.Text.Json.JsonValueKind.Null
            ? (v.ValueKind == System.Text.Json.JsonValueKind.String ? v.GetString() ?? "" : v.GetRawText())
            : "";

        IActionResult NoMatch(string reason) => Ok(new { success = true, matched = false, reason });

        if (!string.Equals(Str("transferType"), "in", StringComparison.OrdinalIgnoreCase)) return NoMatch("not-incoming");
        var account = Str("accountNumber");
        if (account.Length > 0 && account != bank.AccountNumber.Trim()) return NoMatch("other-account");
        if (!decimal.TryParse(Str("transferAmount"), System.Globalization.NumberStyles.Number,
                System.Globalization.CultureInfo.InvariantCulture, out var amount)) return NoMatch("bad-amount");

        var memos = BankTransferHelper.FindMemos(bank.MemoPrefix, Str("content"), Str("code"), Str("description"));
        if (memos.Count == 0) return NoMatch("no-memo");

        var candidate = await db.Payments.AsNoTracking()
            .Where(p => p.Method == PaymentMethod.BankTransfer && p.TxnRef != null && memos.Contains(p.TxnRef))
            .Select(p => new { p.Id, p.Amount, p.Status, p.TxnRef })
            .FirstOrDefaultAsync(ct);
        if (candidate is null) return NoMatch("unknown-memo");

        var bankTxn = $"SEPAY-{(Str("id").Length > 0 ? Str("id") : Str("referenceCode"))}";
        if (candidate.Status is PaymentStatus.Success or PaymentStatus.Refunded
            || await db.Payments.AnyAsync(p => p.ProviderTxnId == bankTxn, ct))
            return Ok(new { success = true, matched = true, duplicate = true });

        if (candidate.Amount != amount)
        {
            await NotificationRules.NotifyManagementAsync(db, "Chuyển khoản lệch số tiền",
                $"Nhận {amount:N0} đ với nội dung {candidate.TxnRef} nhưng cần {candidate.Amount:N0} đ. Hãy đối soát và xác nhận thủ công nếu hợp lệ.",
                "/manager/bank-transfers", null, ct);
            await db.SaveChangesAsync(ct);
            return NoMatch("amount-mismatch");
        }

        await ReopenTimedOutTransferAsync(candidate.Id, ct);
        var result = await settlement.SettleSuccessAsync(candidate.Id, bankTxn, VnPayClient.FormatVnTime(DateTime.UtcNow), ct);
        await audit.WriteAsync(null, "bank-webhook", $"Nhận chuyển khoản {candidate.TxnRef}", AuditActionType.Payment,
            $"PAYMENT-{candidate.Id}", AuditStatus.Success, $"{amount:N0} VND, giao dịch ngân hàng {bankTxn}, kết quả {result.Outcome}", ct);
        return Ok(new { success = true, matched = true, outcome = result.Outcome.ToString() });
    }

    /// <summary>
    /// IPN: VNPay gọi máy chủ → máy chủ để báo kết quả (cần địa chỉ công khai, cấu hình ở trang quản trị merchant
    /// VNPay). Đây là nguồn xác nhận chính thức. Phản hồi theo đúng đặc tả IPN của VNPay (RspCode/Message).
    /// </summary>
    [HttpGet("vnpay/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn(CancellationToken ct)
    {
        var result = await settlement.SettleVnPayCallbackAsync(QueryToDictionary(), ct);
        var (code, message) = result.Outcome switch
        {
            SettlementOutcome.Confirmed or SettlementOutcome.RefundQueued or SettlementOutcome.Failed => ("00", "Confirm Success"),
            SettlementOutcome.AlreadyProcessed => ("02", "Order already confirmed"),
            SettlementOutcome.NotFound => ("01", "Order not found"),
            SettlementOutcome.AmountMismatch => ("04", "Invalid amount"),
            _ => ("97", "Invalid signature"),
        };
        // VNPay đòi đúng tên trường "RspCode"/"Message"; JsonResult mặc định đổi sang camelCase nên phải tắt.
        return new JsonResult(new { RspCode = code, Message = message },
            new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = null });
    }

    /// <summary>
    /// ReturnUrl: trình duyệt của khách quay về trang frontend rồi frontend gọi endpoint này với nguyên query
    /// VNPay gửi. Endpoint kiểm chữ ký và cũng chốt giao dịch (idempotent, cùng đường với IPN) để luồng chạy được
    /// cả ở máy dev, nơi VNPay không gọi được IPN vào localhost.
    /// </summary>
    [HttpGet("vnpay/return")]
    [AllowAnonymous]
    public async Task<ActionResult<PaymentResultDto>> VnPayReturn(CancellationToken ct)
    {
        var result = await settlement.SettleVnPayCallbackAsync(QueryToDictionary(), ct);
        if (result.Outcome is SettlementOutcome.InvalidSignature or SettlementOutcome.NotFound or SettlementOutcome.AmountMismatch)
            return BadRequest(new { message = result.Message });

        // Dù lời gọi này hay IPN là bên chốt, trạng thái thật là trạng thái hiện tại của giao dịch.
        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == result.Payment!.Id)).FirstAsync(ct);
        var (success, message) = dto.Status switch
        {
            nameof(PaymentStatus.Success) or nameof(PaymentStatus.Refunded) => (true, "Thanh toán thành công."),
            nameof(PaymentStatus.Failed) => (false, dto.FailureReason ?? "Thanh toán không thành công."),
            _ => (false, "Giao dịch đang được xử lý."),
        };
        // Tiền đã thu nhưng lượt đặt hết hạn: khách phải biết khoản này sẽ được hoàn chứ không phải đã có vé.
        if (result.Outcome == SettlementOutcome.RefundQueued) (success, message) = (false, result.Message);
        return Ok(new PaymentResultDto { Success = success, Message = message, Payment = dto });
    }

    /// <summary>Lịch sử thanh toán của chính hành khách, mới nhất trước.</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetMine(CancellationToken ct)
    {
        var me = User.AccountId();
        return Ok(await Project(db.Payments.AsNoTracking()
                .Where(p => p.Booking!.PassengerId == me)
                .OrderByDescending(p => p.Id))
            .ToListAsync(ct));
    }

    /// <summary>Toàn bộ giao dịch cho Admin, Quản lý.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetAll(
        [FromQuery] PaymentStatus? status, [FromQuery] PaymentMethod? method, CancellationToken ct)
    {
        var q = db.Payments.AsNoTracking().Where(p => p.BookingId != null);
        if (status.HasValue) q = q.Where(p => p.Status == status.Value);
        if (method.HasValue) q = q.Where(p => p.Method == method.Value);
        return Ok(await Project(q.OrderByDescending(p => p.Id)).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PaymentDto>> Get(long id, CancellationToken ct)
    {
        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == id)).FirstOrDefaultAsync(ct);
        if (dto is null) return NotFound();
        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && dto.PassengerId != User.AccountId()) return Forbid();
        return Ok(WithTransfer(dto));
    }
}

/// <summary>Hóa đơn của các giao dịch thanh toán thành công.</summary>
[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(AppDbContext db, IInvoiceMailQueue mailQueue) : ControllerBase
{
    private static IQueryable<InvoiceDto> Project(IQueryable<Invoice> q) => q.Select(i => new InvoiceDto
    {
        Id = i.Id,
        PassengerId = i.Payment.Booking!.PassengerId,
        InvoiceNo = i.InvoiceNo,
        PaymentId = i.PaymentId,
        BookingCode = i.Payment.Booking.BookingCode,
        PassengerName = i.Payment.Booking.Passenger.FullName,
        Email = i.Email,
        Total = i.Total,
        Method = i.Payment.Method.ToString(),
        PaidAt = i.Payment.PaidAt,
        RouteCode = i.Payment.Booking.Trip.BusRoute.Code,
        RouteName = i.Payment.Booking.Trip.BusRoute.Name,
        DepartureAt = i.Payment.Booking.Trip.DepartureAt,
        Seats = i.Payment.Booking.Tickets.Where(t => t.Status != TicketStatus.Exchanged).Select(t => t.Seat.SeatCode).ToList(),
        SentAt = i.SentAt,
        EmailStatus = i.SentAt != null ? "Sent"
            : i.Email == "" ? "NoAddress"
            : i.EmailAttempts >= InvoiceEmailService.MaxAttempts ? "Failed"
            : "Pending",
    });

    /// <summary>
    /// Gửi (lại) email hóa đơn. Khách chỉ gửi được hóa đơn của mình; địa chỉ mới chỉ nhận khi hóa đơn chưa có địa chỉ
    /// (tài khoản chưa có email), còn không thì gửi tới địa chỉ đã lưu, để không dùng chức năng này gửi thư rác tới
    /// người khác. Việc gửi chạy nền nên phản hồi 202 kèm trạng thái hiện tại.
    /// </summary>
    [HttpPost("{id:long}/send")]
    [Authorize(Roles = "Passenger,Admin,Manager")]
    public async Task<ActionResult<InvoiceDto>> Send(long id, SendInvoiceEmailRequest request, CancellationToken ct)
    {
        var owner = await db.Invoices.AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new { PassengerId = i.Payment.Booking!.PassengerId, i.Email })
            .FirstOrDefaultAsync(ct);
        if (owner is null) return NotFound();

        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && owner.PassengerId != User.AccountId()) return NotFound();

        var target = owner.Email;
        if (string.IsNullOrWhiteSpace(target))
        {
            target = request.Email?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(target))
                return BadRequest(new { message = "Tài khoản chưa có email. Vui lòng nhập địa chỉ email để nhận hóa đơn." });
        }

        await db.Invoices.Where(i => i.Id == id).ExecuteUpdateAsync(s => s
            .SetProperty(i => i.Email, target)
            .SetProperty(i => i.SentAt, (DateTime?)null)
            .SetProperty(i => i.EmailAttempts, 0)
            .SetProperty(i => i.EmailError, (string?)null), ct);
        mailQueue.Signal();

        var dto = await Project(db.Invoices.AsNoTracking().Where(i => i.Id == id)).FirstAsync(ct);
        return Accepted(dto);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<IReadOnlyList<InvoiceDto>>> GetMine(CancellationToken ct)
    {
        var me = User.AccountId();
        return Ok(await Project(db.Invoices.AsNoTracking()
                .Where(i => i.Payment.Booking!.PassengerId == me)
                .OrderByDescending(i => i.Payment.PaidAt).ThenByDescending(i => i.Id))
            .ToListAsync(ct));
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<InvoiceDto>>> GetAll(CancellationToken ct)
        => Ok(await Project(db.Invoices.AsNoTracking().OrderByDescending(i => i.Id)).ToListAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<InvoiceDto>> Get(long id, CancellationToken ct)
    {
        var dto = await Project(db.Invoices.AsNoTracking().Where(i => i.Id == id)).FirstOrDefaultAsync(ct);
        if (dto is null) return NotFound();
        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && dto.PassengerId != User.AccountId()) return Forbid();
        return Ok(dto);
    }
}
