using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;
using SmartBusTicketing.Api.Services.Payments;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Hoàn tiền. Yêu cầu hoàn tiền được tạo tự động khi một vé đã thanh toán bị hủy (quản lý duyệt yêu cầu hủy,
/// hoặc chuyến bị hủy). Quản lý xử lý: duyệt thì hoàn thành công, từ chối thì phải ghi lý do. Khi tổng các lần hoàn
/// thành công bằng số tiền đã trả, giao dịch chuyển sang Refunded.
/// </summary>
[ApiController]
[Route("api/refunds")]
[Authorize]
public class RefundsController(AppDbContext db, AuditLogService audit, RefundExecutor executor) : ControllerBase
{
    private static IQueryable<RefundDto> Project(IQueryable<Refund> q) => q.Select(r => new RefundDto
    {
        Id = r.Id,
        PaymentId = r.PaymentId,
        BookingCode = r.Payment.Booking!.BookingCode,
        PassengerName = r.Payment.Booking.Passenger.FullName,
        PassengerEmail = r.Payment.Booking.Passenger.Email,
        PassengerPhone = r.Payment.Booking.Passenger.Phone,
        PaymentMethod = r.Payment.Method.ToString(),
        Amount = r.Amount,
        Reason = r.Reason.ToString(),
        Status = r.Status.ToString(),
        CreatedAt = r.CreatedAt,
        ProcessedAt = r.ProcessedAt,
        ProcessedByName = r.Processor != null ? r.Processor.FullName : null,
        Note = r.Note,
        ChangeRequestId = r.ChangeRequestId,
        Attempts = r.Attempts,
        NeedsManual = r.Status == RefundStatus.Pending && r.Attempts >= RefundExecutor.MaxAttempts,
    });

    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<RefundDto>>> GetAll([FromQuery] RefundStatus? status, CancellationToken ct)
    {
        var q = db.Refunds.AsNoTracking().AsQueryable();
        if (status.HasValue) q = q.Where(r => r.Status == status.Value);
        return Ok(await Project(q.OrderBy(r => r.Status == RefundStatus.Pending ? 0 : 1).ThenByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id))
            .ToListAsync(ct));
    }

    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<IReadOnlyList<RefundDto>>> GetMine(CancellationToken ct)
    {
        var me = User.AccountId();
        return Ok(await Project(db.Refunds.AsNoTracking()
                .Where(r => r.Payment.Booking!.PassengerId == me)
                .OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id))
            .ToListAsync(ct));
    }

    [HttpPatch("{id:long}/process")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<RefundDto>> Process(long id, ProcessRefundRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        if (!request.Approve && string.IsNullOrWhiteSpace(request.Note))
            return BadRequest(new { message = "Vui lòng ghi lý do khi từ chối hoàn tiền." });

        var refund = await db.Refunds.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (refund is null) return NotFound();

        if (request.Approve && request.ConfirmedExternally && string.IsNullOrWhiteSpace(request.Note))
            return BadRequest(new { message = "Vui lòng ghi mã hoàn tiền hoặc thông tin đối soát khi xác nhận đã hoàn ngoài cổng." });

        // Khoản hoàn của giao dịch VNPay: duyệt nghĩa là gọi API hoàn tiền của cổng. Chỉ khi quản lý xác nhận đã hoàn
        // bằng đường khác (ConfirmedExternally) mới ghi nhận thủ công, nếu không thì "duyệt" mà tiền chưa về khách.
        var paymentMethod = await db.Payments.Where(p => p.Id == refund.PaymentId).Select(p => p.Method).FirstAsync(ct);
        if (request.Approve && !request.ConfirmedExternally && RefundExecutor.IsGatewayMethod(paymentMethod))
        {
            var run = await executor.ExecuteAsync(id, actorId, User.Username() ?? "manager", manual: true, ct);
            switch (run.Outcome)
            {
                case RefundExecution.Succeeded:
                    return Ok(await Project(db.Refunds.AsNoTracking().Where(r => r.Id == id)).FirstAsync(ct));
                case RefundExecution.AlreadyProcessed:
                    return Conflict(new { message = "Yêu cầu hoàn tiền này đã được xử lý." });
                default:
                    return StatusCode(StatusCodes.Status502BadGateway, new { message = run.Message });
            }
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var newStatus = request.Approve ? RefundStatus.Success : RefundStatus.Failed;
        var now = DateTime.UtcNow;
        var note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();

        // Chỉ một yêu cầu xử lý được một khoản hoàn: yêu cầu đến sau thấy 0 dòng bị đổi.
        var updated = await db.Refunds
            .Where(r => r.Id == id && r.Status == RefundStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.Status, newStatus)
                .SetProperty(r => r.ProcessedAt, now)
                .SetProperty(r => r.ProcessedBy, actorId)
                .SetProperty(r => r.Note, note), ct);
        if (updated != 1)
        {
            await tx.RollbackAsync(ct);
            return Conflict(new { message = "Yêu cầu hoàn tiền này đã được xử lý." });
        }

        var passengerId = await db.Payments.Where(p => p.Id == refund.PaymentId).Select(p => p.Booking!.PassengerId).FirstAsync(ct);
        NotificationRules.Notify(db, passengerId, NotificationType.Other,
            request.Approve ? "Đã hoàn tiền" : "Yêu cầu hoàn tiền bị từ chối",
            request.Approve
                ? $"Bạn đã được hoàn {refund.Amount:N0} đ về phương thức thanh toán ban đầu."
                : $"Yêu cầu hoàn {refund.Amount:N0} đ bị từ chối. Lý do: {note}",
            "/passenger/payments");
        await db.SaveChangesAsync(ct);

        if (request.Approve)
        {
            var payment = await db.Payments.Include(p => p.Refunds).FirstAsync(p => p.Id == refund.PaymentId, ct);
            var refunded = payment.Refunds.Where(r => r.Status == RefundStatus.Success).Sum(r => r.Amount);
            if (refunded >= payment.Amount && payment.Status == PaymentStatus.Success)
            {
                payment.Status = PaymentStatus.Refunded;
                await db.SaveChangesAsync(ct);
            }
        }
        await tx.CommitAsync(ct);

        await audit.WriteAsync(actorId, User.Username() ?? "system",
            request.Approve ? $"Duyệt hoàn tiền #{id}" : $"Từ chối hoàn tiền #{id}",
            AuditActionType.Payment, $"REFUND-{id}", AuditStatus.Success,
            $"{refund.Amount:N0} VND. {note}", ct);

        return Ok(await Project(db.Refunds.AsNoTracking().Where(r => r.Id == id)).FirstAsync(ct));
    }

    // ─── Refund Tier endpoints ────────────────────────────────────────────

    /// <summary>Lấy danh sách bậc phí hoàn tiền hiện tại.</summary>
    [HttpGet("tiers")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<RefundTierDto>>> GetTiers(CancellationToken ct)
    {
        var tiers = await db.RefundTiers
            .AsNoTracking()
            .OrderByDescending(t => t.HoursBefore)
            .Select(t => new RefundTierDto(t.Id, t.HoursBefore, t.Percent))
            .ToListAsync(ct);
        return Ok(tiers);
    }

    /// <summary>Thay thế toàn bộ bậc phí hoàn tiền (idempotent replace).</summary>
    [HttpPut("tiers")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<RefundTierDto>>> PutTiers(
        [FromBody] List<RefundTierRequest> tiers, CancellationToken ct)
    {
        if (tiers.Any(t => t.HoursBefore < 0 || t.Percent < 0 || t.Percent > 100))
            return BadRequest(new { message = "Số giờ phải >= 0, phần trăm từ 0–100." });
        if (tiers.GroupBy(t => t.HoursBefore).Any(g => g.Count() > 1))
            return BadRequest(new { message = "Không được có hai bậc cùng số giờ." });

        var actorId = User.AccountId();

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var existing = await db.RefundTiers.ToListAsync(ct);
        db.RefundTiers.RemoveRange(existing);
        await db.SaveChangesAsync(ct);

        var now = DateTime.UtcNow;
        db.RefundTiers.AddRange(tiers.Select(t => new RefundTierRow
        {
            HoursBefore = t.HoursBefore,
            Percent = t.Percent,
            UpdatedAt = now,
        }));
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        if (actorId is not null)
            await audit.WriteAsync(actorId, User.Username() ?? "system",
                "Cập nhật bảng bậc hoàn tiền",
                AuditActionType.Payment, "REFUND-TIERS", AuditStatus.Success,
                $"Số bậc mới: {tiers.Count}", ct);

        var saved = await db.RefundTiers
            .AsNoTracking()
            .OrderByDescending(t => t.HoursBefore)
            .Select(t => new RefundTierDto(t.Id, t.HoursBefore, t.Percent))
            .ToListAsync(ct);
        return Ok(saved);
    }
}

