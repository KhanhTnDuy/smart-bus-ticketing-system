using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Thanh toán vé.
///
/// Chưa nối cổng thanh toán thật: lệnh thanh toán luôn thành công và sinh mã giao dịch giả lập, nhưng toàn bộ
/// phần còn lại chạy thật. Số tiền lấy từ Booking.FinalAmount ở máy chủ, không nhận từ client. Lượt đặt chuyển
/// Pending sang Confirmed bằng một câu UPDATE có điều kiện (còn trong thời hạn giữ chỗ) nên hai lần bấm thanh
/// toán cùng lúc, hoặc thanh toán sau khi hết hạn giữ chỗ, không thể cùng thành công. Thanh toán xong, các vé Held
/// của lượt đặt chuyển sang Valid (có thể quét QR) và hóa đơn được tạo.
/// </summary>
[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
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

    /// <summary>Thanh toán một lượt đặt đang giữ chỗ của chính hành khách đăng nhập.</summary>
    [HttpPost]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<PaymentDto>> Pay(PayBookingRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        if (!Enum.IsDefined(request.Method))
            return BadRequest(new { message = "Phương thức thanh toán không hợp lệ." });

        var booking = await db.Bookings.AsNoTracking()
            .Include(b => b.Passenger)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.PassengerId == actorId, ct);
        if (booking is null) return NotFound(new { message = "Không tìm thấy lượt đặt vé của bạn." });

        if (booking.Status == BookingStatus.Confirmed)
            return Conflict(new { message = "Lượt đặt này đã được thanh toán." });
        if (booking.Status != BookingStatus.Pending)
            return Conflict(new { message = "Lượt đặt này đã bị hủy hoặc hết hạn giữ chỗ, không thể thanh toán." });
        if (booking.FinalAmount <= 0)
            return BadRequest(new { message = "Lượt đặt không có số tiền cần thanh toán." });

        var now = DateTime.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Chốt lượt đặt trước: chỉ một yêu cầu thấy 1 dòng bị đổi.
        var confirmed = await db.Bookings
            .Where(b => b.Id == booking.Id && b.Status == BookingStatus.Pending && b.HoldExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Confirmed), ct);
        if (confirmed != 1)
        {
            await tx.RollbackAsync(ct);
            return Conflict(new { message = "Đã hết thời gian giữ chỗ (10 phút) hoặc lượt đặt vừa được xử lý. Vui lòng đặt vé lại." });
        }

        var payment = new Payment
        {
            BookingId = booking.Id,
            Method = request.Method,
            Amount = booking.FinalAmount,
            Status = PaymentStatus.Success,
            ProviderTxnId = $"SIM-{request.Method.ToString().ToUpperInvariant()}-{Guid.NewGuid().ToString("N")[..12].ToUpperInvariant()}",
            PaidAt = now,
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);

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
        NotificationRules.Notify(db, actorId.Value, NotificationType.Other, "Thanh toán thành công",
            $"Đã thanh toán {payment.Amount:N0} đ cho lượt đặt {booking.BookingCode}. Vé điện tử đã sẵn sàng.",
            "/passenger/tickets", booking.TripId);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        await audit.WriteAsync(actorId, User.Username() ?? "passenger", $"Thanh toán {booking.BookingCode}",
            AuditActionType.Payment, $"PAYMENT-{payment.Id}", AuditStatus.Success,
            $"{request.Method}, {payment.Amount:N0} VND, giao dịch {payment.ProviderTxnId}", ct);

        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == payment.Id)).FirstAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = payment.Id }, dto);
    }

    /// <summary>Lịch sử thanh toán của chính hành khách, mới nhất trước.</summary>
    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<IReadOnlyList<PaymentDto>>> GetMine(CancellationToken ct)
    {
        var me = User.AccountId();
        return Ok(await Project(db.Payments.AsNoTracking()
                .Where(p => p.Booking!.PassengerId == me)
                .OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id))
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
        return Ok(await Project(q.OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<PaymentDto>> Get(long id, CancellationToken ct)
    {
        var dto = await Project(db.Payments.AsNoTracking().Where(p => p.Id == id)).FirstOrDefaultAsync(ct);
        if (dto is null) return NotFound();
        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && dto.PassengerId != User.AccountId()) return Forbid();
        return Ok(dto);
    }
}

/// <summary>Hóa đơn của các giao dịch thanh toán thành công.</summary>
[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController(AppDbContext db) : ControllerBase
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
    });

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
