using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Hồ sơ đăng ký ưu đãi giá vé (học sinh, sinh viên, người cao tuổi...).
///
/// Hành khách nộp hồ sơ kèm giấy tờ đã tải lên; Admin, Quản lý duyệt hoặc từ chối. Hồ sơ đã duyệt và còn hiệu
/// lực là điều kiện để BookingsController tính giá ưu đãi, nên đây là nơi duy nhất quyết định hành khách nào
/// được giảm giá. Hành khách chỉ xem được hồ sơ của mình; danh sách toàn bộ và quyền duyệt chỉ dành cho
/// Admin, Quản lý.
/// </summary>
[ApiController]
[Route("api/discount-applications")]
[Authorize]
public class DiscountApplicationsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private static IQueryable<DiscountApplicationDto> Project(IQueryable<PassengerVerification> q) => q.Select(v => new DiscountApplicationDto
    {
        Id = v.Id,
        PassengerId = v.AccountId,
        PassengerName = v.Account.FullName,
        PassengerEmail = v.Account.Email,
        PassengerPhone = v.Account.Phone,
        PassengerTypeId = v.PassengerTypeId,
        PassengerTypeCode = v.PassengerType.Code,
        PassengerTypeName = v.PassengerType.Name,
        DiscountPercent = v.PassengerType.DiscountPercent,
        DocumentUrl = v.DocumentUrl,
        Status = v.Status.ToString(),
        SubmittedAt = v.SubmittedAt,
        ReviewedAt = v.ReviewedAt,
        ReviewedByName = v.Reviewer != null ? v.Reviewer.FullName : null,
        ValidUntil = v.ValidUntil,
        RejectReason = v.RejectReason,
    });

    /// <summary>Danh sách hồ sơ cho Admin, Quản lý, chờ duyệt lên đầu; lọc theo Pending, Approved, Rejected.</summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<DiscountApplicationDto>>> GetAll([FromQuery] VerificationStatus? status, CancellationToken ct)
    {
        var q = db.PassengerVerifications.AsNoTracking().AsQueryable();
        if (status.HasValue) q = q.Where(v => v.Status == status.Value);
        return Ok(await Project(q.OrderBy(v => v.Status == VerificationStatus.Pending ? 0 : 1).ThenByDescending(v => v.SubmittedAt).ThenByDescending(v => v.Id))
            .ToListAsync(ct));
    }

    [HttpGet("my")]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<IReadOnlyList<DiscountApplicationDto>>> GetMine(CancellationToken ct)
    {
        var me = User.AccountId();
        return Ok(await Project(db.PassengerVerifications.AsNoTracking().Where(v => v.AccountId == me)
                .OrderByDescending(v => v.SubmittedAt).ThenByDescending(v => v.Id))
            .ToListAsync(ct));
    }

    /// <summary>Hành khách nộp hồ sơ. Mỗi lúc chỉ được có một hồ sơ chờ duyệt, và không nộp lại khi đang có ưu đãi cùng loại còn hạn.</summary>
    [HttpPost]
    [Authorize(Roles = "Passenger")]
    public async Task<ActionResult<DiscountApplicationDto>> Submit(SubmitDiscountApplicationRequest request, CancellationToken ct)
    {
        var me = User.AccountId();
        if (me is null) return Unauthorized();

        var type = await db.PassengerTypes.AsNoTracking().FirstOrDefaultAsync(t => t.Id == request.PassengerTypeId, ct);
        if (type is null) return NotFound(new { message = "Không tìm thấy đối tượng ưu đãi đã chọn." });
        if (type.DiscountPercent <= 0)
            return BadRequest(new { message = $"Đối tượng '{type.Name}' không có ưu đãi giá vé nên không cần nộp hồ sơ." });

        // Chỉ nhận giấy tờ do chính người nộp tải lên qua /api/uploads, không nhận đường dẫn tùy ý.
        if (!UploadsController.IsOwnedUploadUrl(request.DocumentUrl, me.Value))
            return BadRequest(new { message = "Giấy tờ minh chứng không hợp lệ. Vui lòng tải tệp lên lại." });

        if (await db.PassengerVerifications.AnyAsync(v => v.AccountId == me && v.Status == VerificationStatus.Pending, ct))
            return Conflict(new { message = "Bạn đang có một hồ sơ chờ duyệt. Vui lòng đợi kết quả trước khi nộp hồ sơ khác." });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (await db.PassengerVerifications.AnyAsync(v => v.AccountId == me && v.PassengerTypeId == type.Id
                && v.Status == VerificationStatus.Approved && (v.ValidUntil == null || v.ValidUntil >= today), ct))
            return Conflict(new { message = $"Bạn đã có ưu đãi '{type.Name}' còn hiệu lực." });

        var entity = new PassengerVerification
        {
            AccountId = me.Value,
            PassengerTypeId = type.Id,
            DocumentUrl = request.DocumentUrl,
            Status = VerificationStatus.Pending,
            SubmittedAt = DateTime.UtcNow,
        };
        db.PassengerVerifications.Add(entity);
        await NotificationRules.NotifyManagementAsync(db, "Hồ sơ ưu đãi mới",
            $"{User.Username()} nộp hồ sơ ưu đãi '{type.Name}' chờ duyệt.", "/manager/verifications", me, ct);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(me, User.Username() ?? "passenger", "Nộp hồ sơ ưu đãi", AuditActionType.Create,
            $"DISCOUNT-{entity.Id}", AuditStatus.Success, type.Name, ct);

        var dto = await Project(db.PassengerVerifications.AsNoTracking().Where(v => v.Id == entity.Id)).FirstAsync(ct);
        return CreatedAtAction(nameof(GetMine), dto);
    }

    /// <summary>Duyệt hoặc từ chối một hồ sơ đang chờ. Từ chối bắt buộc có lý do; xử lý lần hai trả 409.</summary>
    [HttpPost("{id:long}/review")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<DiscountApplicationDto>> Review(long id, ReviewDiscountApplicationRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        if (!request.Approve && string.IsNullOrWhiteSpace(request.RejectReason))
            return BadRequest(new { message = "Vui lòng nhập lý do từ chối hồ sơ." });

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var validUntil = request.Approve ? (request.ValidUntil ?? today.AddYears(1)) : (DateOnly?)null;
        if (validUntil is { } v && v < today)
            return BadRequest(new { message = "Ngày hết hạn ưu đãi không được nằm trong quá khứ." });

        var app = await db.PassengerVerifications.AsNoTracking().Include(a => a.PassengerType).FirstOrDefaultAsync(a => a.Id == id, ct);
        if (app is null) return NotFound(new { message = $"Không tìm thấy hồ sơ ưu đãi có ID = {id}." });

        var newStatus = request.Approve ? VerificationStatus.Approved : VerificationStatus.Rejected;
        var now = DateTime.UtcNow;
        var reason = request.Approve ? null : request.RejectReason!.Trim();

        // Chỉ một yêu cầu xử lý được hồ sơ: yêu cầu đến sau thấy 0 dòng bị đổi.
        var updated = await db.PassengerVerifications
            .Where(a => a.Id == id && a.Status == VerificationStatus.Pending)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.Status, newStatus)
                .SetProperty(a => a.ReviewedBy, actorId)
                .SetProperty(a => a.ReviewedAt, now)
                .SetProperty(a => a.ValidUntil, validUntil)
                .SetProperty(a => a.RejectReason, reason), ct);
        if (updated != 1) return Conflict(new { message = "Hồ sơ này đã được xử lý." });

        NotificationRules.Notify(db, app.AccountId, NotificationType.Other,
            request.Approve ? "Hồ sơ ưu đãi đã được duyệt" : "Hồ sơ ưu đãi bị từ chối",
            request.Approve
                ? $"Bạn được hưởng ưu đãi '{app.PassengerType.Name}' ({app.PassengerType.DiscountPercent:0.#}%) đến {validUntil:dd/MM/yyyy}."
                : $"Hồ sơ '{app.PassengerType.Name}' bị từ chối. Lý do: {reason}",
            "/passenger/discount");
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(actorId, User.Username() ?? "system",
            request.Approve ? $"Duyệt hồ sơ ưu đãi #{id}" : $"Từ chối hồ sơ ưu đãi #{id}",
            AuditActionType.StatusChange, $"DISCOUNT-{id}", AuditStatus.Success, reason ?? $"Hiệu lực đến {validUntil:dd/MM/yyyy}", ct);

        return Ok(await Project(db.PassengerVerifications.AsNoTracking().Where(a => a.Id == id)).FirstAsync(ct));
    }
}
