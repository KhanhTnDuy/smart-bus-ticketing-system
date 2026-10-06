using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/discount-applications")]
[Authorize]
public class DiscountApplicationsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "Admin/Manager";

    /// <summary>
    /// SCRUM-71: Xem danh sách hồ sơ ưu đãi kèm loại đối tượng, giấy tờ minh chứng và lọc theo trạng thái
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetApplications([FromQuery] string? status, CancellationToken ct)
    {
        var query = db.PassengerVerifications
            .Include(v => v.Account)
            .Include(v => v.PassengerType)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<VerificationStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(v => v.Status == parsedStatus);
            }
            else
            {
                return BadRequest(new { message = $"Trạng thái '{status}' không hợp lệ!" });
            }
        }

        var applications = await query
            .OrderByDescending(v => v.Id)
            .Select(v => new
            {
                id = v.Id,
                passengerId = v.AccountId,
                passengerName = v.Account != null ? v.Account.FullName : "N/A",
                email = v.Account != null ? v.Account.Email : "",
                phoneNumber = v.Account != null ? v.Account.Phone : "",
                discountType = v.PassengerType != null ? v.PassengerType.Name : "N/A",
                proofDocumentUrl = v.DocumentUrl,
                status = v.Status.ToString(),
                reviewedBy = v.ReviewedBy,
                validUntil = v.ValidUntil
            })
            .ToListAsync(ct);

        return Ok(new
        {
            total = applications.Count,
            data = applications
        });
    }

    /// <summary>
    /// SCRUM-73: Duyệt/từ chối hồ sơ: Cập nhật trạng thái và ngày hết hạn ưu đãi
    /// </summary>
    [HttpPost("{id:long}/review")]
    public async Task<IActionResult> ReviewApplication(long id, [FromBody] ReviewDiscountApplicationDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var verification = await db.PassengerVerifications.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (verification == null)
        {
            return NotFound(new { message = $"Không tìm thấy hồ sơ ưu đãi có ID = {id}!" });
        }

        if (dto.IsApproved)
        {
            verification.Status = VerificationStatus.Approved;
            verification.ValidUntil = dto.ExpiresAt.HasValue 
                ? DateOnly.FromDateTime(dto.ExpiresAt.Value) 
                : DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1));
        }
        else
        {
            verification.Status = VerificationStatus.Rejected;
        }

        verification.ReviewedBy = GetActorId();
        await db.SaveChangesAsync(ct);

        var actionName = dto.IsApproved ? "APPROVE_DISCOUNT_APP" : "REJECT_DISCOUNT_APP";
        await audit.WriteAsync(GetActorId(), GetActorName(), actionName, AuditActionType.Update, $"PASSENGER_VERIFICATION-{id}", ct: ct);

        return Ok(new
        {
            message = dto.IsApproved ? "Đã duyệt hồ sơ ưu đãi thành công!" : "Đã từ chối hồ sơ ưu đãi!",
            applicationId = verification.Id,
            status = verification.Status.ToString(),
            validUntil = verification.ValidUntil
        });
    }
}