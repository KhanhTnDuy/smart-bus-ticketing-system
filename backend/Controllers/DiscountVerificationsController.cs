using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/discount-verifications")]
[Authorize(Roles = "Admin,Manager")]
public sealed class DiscountVerificationsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] VerificationStatus? status,
        [FromQuery] int? passengerTypeId,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var query = db.PassengerVerifications.AsNoTracking()
            .Include(x => x.Account)
            .Include(x => x.PassengerType)
            .Include(x => x.Reviewer)
            .AsQueryable();

        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        if (passengerTypeId.HasValue) query = query.Where(x => x.PassengerTypeId == passengerTypeId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Account.FullName.Contains(term)
                || x.Account.Username.Contains(term)
                || (x.Account.Email != null && x.Account.Email.Contains(term))
                || (x.Account.Phone != null && x.Account.Phone.Contains(term)));
        }

        var items = await query.OrderBy(x => x.Status).ThenByDescending(x => x.Id)
            .Select(x => new
            {
                x.Id,
                AccountId = x.AccountId,
                PassengerName = x.Account.FullName,
                x.Account.Username,
                x.Account.Email,
                x.Account.Phone,
                x.PassengerTypeId,
                PassengerType = x.PassengerType.Name,
                x.PassengerType.DiscountPercent,
                x.DocumentUrl,
                Status = x.Status.ToString(),
                x.ReviewedBy,
                ReviewerName = x.Reviewer == null ? null : x.Reviewer.FullName,
                x.ValidUntil
            }).ToListAsync(ct);

        return Ok(new
        {
            total = items.Count,
            pending = items.Count(x => x.Status == VerificationStatus.Pending.ToString()),
            approved = items.Count(x => x.Status == VerificationStatus.Approved.ToString()),
            rejected = items.Count(x => x.Status == VerificationStatus.Rejected.ToString()),
            items
        });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var item = await db.PassengerVerifications.AsNoTracking()
            .Include(x => x.Account).Include(x => x.PassengerType).Include(x => x.Reviewer)
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                AccountId = x.AccountId,
                PassengerName = x.Account.FullName,
                x.Account.Username,
                x.Account.Email,
                x.Account.Phone,
                x.PassengerTypeId,
                PassengerType = x.PassengerType.Name,
                x.PassengerType.DiscountPercent,
                x.DocumentUrl,
                Status = x.Status.ToString(),
                x.ReviewedBy,
                ReviewerName = x.Reviewer == null ? null : x.Reviewer.FullName,
                x.ValidUntil
            }).FirstOrDefaultAsync(ct);

        return item is null ? NotFound(new { message = "Không tìm thấy hồ sơ ưu đãi." }) : Ok(item);
    }

    [HttpPost("{id:long}/approve")]
    public async Task<IActionResult> Approve(long id, [FromBody] ApproveDiscountVerificationRequest request, CancellationToken ct)
    {
        if (request.ValidUntil < DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { message = "Ngày hết hạn phải từ hôm nay trở đi." });

        var item = await db.PassengerVerifications.Include(x => x.Account)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return NotFound(new { message = "Không tìm thấy hồ sơ ưu đãi." });
        if (item.Status != VerificationStatus.Pending)
            return Conflict(new { message = "Chỉ có thể duyệt hồ sơ đang chờ xử lý." });

        item.Status = VerificationStatus.Approved;
        item.ValidUntil = request.ValidUntil;
        item.ReviewedBy = User.AccountId();
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system", "APPROVE_DISCOUNT_VERIFICATION", AuditActionType.Update,
            $"VERIFICATION-{item.Id}; AccountId={item.AccountId}; ValidUntil={item.ValidUntil}", ct: ct);

        return Ok(new { message = "Đã duyệt hồ sơ ưu đãi.", item.Id, status = item.Status.ToString(), item.ValidUntil, item.ReviewedBy });
    }

    [HttpPost("{id:long}/reject")]
    public async Task<IActionResult> Reject(long id, [FromBody] RejectDiscountVerificationRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Vui lòng nhập lý do từ chối." });

        var item = await db.PassengerVerifications.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return NotFound(new { message = "Không tìm thấy hồ sơ ưu đãi." });
        if (item.Status != VerificationStatus.Pending)
            return Conflict(new { message = "Chỉ có thể từ chối hồ sơ đang chờ xử lý." });

        item.Status = VerificationStatus.Rejected;
        item.ReviewedBy = User.AccountId();
        item.ValidUntil = null;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system", "REJECT_DISCOUNT_VERIFICATION", AuditActionType.Update,
            $"VERIFICATION-{item.Id}; Reason={request.Reason.Trim()}", ct: ct);

        return Ok(new { message = "Đã từ chối hồ sơ ưu đãi.", item.Id, status = item.Status.ToString(), item.ReviewedBy });
    }
}

public sealed class ApproveDiscountVerificationRequest
{
    public DateOnly ValidUntil { get; init; }
}

public sealed class RejectDiscountVerificationRequest
{
    public string Reason { get; init; } = string.Empty;
}
