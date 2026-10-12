using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/discount-applications")]
[Authorize]
public sealed class DiscountApplicationsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAll([FromQuery] VerificationStatus? status, [FromQuery] int? passengerTypeId, CancellationToken ct)
    {
        var query = db.PassengerVerifications.AsNoTracking()
            .Include(x => x.Account)
            .Include(x => x.PassengerType)
            .Include(x => x.Reviewer)
            .AsQueryable();

        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        if (passengerTypeId.HasValue) query = query.Where(x => x.PassengerTypeId == passengerTypeId.Value);

        var items = await query.OrderByDescending(x => x.Id).Select(x => new
        {
            x.Id,
            x.AccountId,
            PassengerName = x.Account.FullName,
            PassengerUsername = x.Account.Username,
            PassengerEmail = x.Account.Email,
            PassengerPhone = x.Account.Phone,
            x.PassengerTypeId,
            PassengerType = x.PassengerType.Name,
            x.PassengerType.Code,
            x.PassengerType.DiscountPercent,
            x.DocumentUrl,
            Status = x.Status.ToString(),
            x.RejectReason,
            x.ReviewedBy,
            ReviewerName = x.Reviewer == null ? null : x.Reviewer.FullName,
            x.ReviewedAt,
            x.ValidUntil
        }).ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<IActionResult> GetMy(CancellationToken ct)
    {
        var accountId = User.AccountId();
        if (accountId is null) return Unauthorized();

        var items = await db.PassengerVerifications.AsNoTracking()
            .Where(x => x.AccountId == accountId.Value)
            .Include(x => x.PassengerType)
            .OrderByDescending(x => x.Id)
            .Select(x => new
            {
                x.Id,
                x.PassengerTypeId,
                PassengerType = x.PassengerType.Name,
                x.PassengerType.Code,
                x.PassengerType.DiscountPercent,
                x.DocumentUrl,
                Status = x.Status.ToString(),
                x.RejectReason,
                x.ReviewedAt,
                x.ValidUntil
            }).ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetById(long id, CancellationToken ct)
    {
        var item = await db.PassengerVerifications.AsNoTracking()
            .Include(x => x.Account)
            .Include(x => x.PassengerType)
            .Include(x => x.Reviewer)
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.AccountId,
                PassengerName = x.Account.FullName,
                PassengerUsername = x.Account.Username,
                PassengerEmail = x.Account.Email,
                PassengerPhone = x.Account.Phone,
                x.PassengerTypeId,
                PassengerType = x.PassengerType.Name,
                x.PassengerType.Code,
                x.PassengerType.DiscountPercent,
                x.DocumentUrl,
                Status = x.Status.ToString(),
                x.RejectReason,
                x.ReviewedBy,
                ReviewerName = x.Reviewer == null ? null : x.Reviewer.FullName,
                x.ReviewedAt,
                x.ValidUntil
            }).FirstOrDefaultAsync(ct);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost("{id:long}/review")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewDiscountApplicationRequest request, CancellationToken ct)
    {
        if (!request.Approve && string.IsNullOrWhiteSpace(request.RejectReason))
            return BadRequest(new { message = "Vui lòng nhập lý do từ chối hồ sơ." });

        if (request.RejectReason?.Length > 1000)
            return BadRequest(new { message = "Lý do từ chối không được vượt quá 1000 ký tự." });

        if (request.Approve && request.ValidUntil.HasValue && request.ValidUntil.Value < DateOnly.FromDateTime(DateTime.UtcNow))
            return BadRequest(new { message = "Ngày hết hạn phải từ hôm nay trở đi." });

        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        var now = DateTime.UtcNow;
        var newStatus = request.Approve ? VerificationStatus.Approved : VerificationStatus.Rejected;
        var reason = request.Approve ? null : request.RejectReason!.Trim();
        var validUntil = request.Approve ? request.ValidUntil : null;

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var exists = await db.PassengerVerifications.AnyAsync(x => x.Id == id, ct);
        if (!exists) return NotFound(new { message = "Không tìm thấy hồ sơ ưu đãi." });

        var updated = await db.PassengerVerifications
            .Where(x => x.Id == id && x.Status == VerificationStatus.Pending)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.Status, newStatus)
                .SetProperty(x => x.ReviewedBy, actorId)
                .SetProperty(x => x.ReviewedAt, now)
                .SetProperty(x => x.ValidUntil, validUntil)
                .SetProperty(x => x.RejectReason, reason), ct);

        if (updated != 1)
            return Conflict(new { message = "Hồ sơ này đã được xử lý trước đó." });

        var action = request.Approve ? $"Duyệt hồ sơ ưu đãi #{id}" : $"Từ chối hồ sơ ưu đãi #{id}";
        await audit.WriteAsync(actorId.Value, User.Username() ?? "system", action,
            AuditActionType.StatusChange, $"DISCOUNT-{id}", AuditStatus.Success,
            request.Approve ? $"Trạng thái: Approved; Hiệu lực đến: {(validUntil?.ToString("dd/MM/yyyy") ?? "Không đặt ngày hết hạn")}" : $"Trạng thái: Rejected; Lý do: {reason}", ct);

        await transaction.CommitAsync(ct);

        var result = await db.PassengerVerifications.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new
            {
                x.Id,
                x.AccountId,
                Status = x.Status.ToString(),
                x.RejectReason,
                x.ReviewedBy,
                x.ReviewedAt,
                x.ValidUntil
            }).FirstAsync(ct);

        return Ok(result);
    }
}

public sealed class ReviewDiscountApplicationRequest
{
    public bool Approve { get; init; }
    public string? RejectReason { get; init; }
    public DateOnly? ValidUntil { get; init; }
}
