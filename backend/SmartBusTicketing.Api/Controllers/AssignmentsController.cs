using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/trips/{tripId:long}/assignments")]
[Authorize(Roles = "Admin,Manager")]
public sealed class AssignmentsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(long tripId, CancellationToken ct)
    {
        if (!await db.Trips.AnyAsync(t => t.Id == tripId, ct)) return NotFound(new { message = "Không tìm thấy chuyến." });

        return Ok(await db.TripStaff.AsNoTracking()
            .Where(x => x.TripId == tripId)
            .OrderBy(x => x.Duty)
            .Select(x => new
            {
                x.TripId, x.AccountId, x.Duty,
                x.Account.Username, x.Account.FullName, x.Account.Phone, x.Account.Role
            }).ToListAsync(ct));
    }

    [HttpPost]
    public async Task<IActionResult> Assign(long tripId, TripStaffRequest request, CancellationToken ct)
    {
        var trip = await db.Trips.FindAsync([tripId], ct);
        if (trip is null) return NotFound(new { message = "Không tìm thấy chuyến." });

        if (trip.Status is TripStatus.Completed or TripStatus.Cancelled)
            return Conflict(new { message = "Không thể phân công nhân sự cho chuyến đã hoàn thành hoặc đã hủy." });

        var account = await db.Accounts.FindAsync([request.AccountId], ct);
        if (account is null || !account.Active)
            return BadRequest(new { message = "Tài khoản nhân sự không tồn tại hoặc đã bị khóa." });

        var requiredRole = request.Duty == StaffDuty.Driver ? AccountRole.Driver : AccountRole.Conductor;
        if (account.Role != requiredRole)
            return BadRequest(new { message = $"Tài khoản phải có role {requiredRole} để nhận nhiệm vụ {request.Duty}." });

        if (await db.TripStaff.AnyAsync(x => x.TripId == tripId && x.AccountId == request.AccountId, ct))
            return Conflict(new { message = "Nhân sự đã được phân công cho chuyến này." });

        if (await db.TripStaff.AnyAsync(x => x.TripId == tripId && x.Duty == request.Duty, ct))
            return Conflict(new { message = $"Chuyến đã có {request.Duty}. Hãy gỡ người cũ trước." });

        var assignment = new TripStaff { TripId = tripId, AccountId = request.AccountId, Duty = request.Duty };
        db.TripStaff.Add(assignment);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            $"Assign {request.Duty}", AuditActionType.Create, $"TRIP-{tripId}", ct: ct);
        return Created($"/api/trips/{tripId}/assignments",
            new { assignment.TripId, assignment.AccountId, assignment.Duty, account.Username, account.FullName });
    }

    [HttpDelete("{accountId:long}")]
    public async Task<IActionResult> Remove(long tripId, long accountId, CancellationToken ct)
    {
        var assignment = await db.TripStaff.FirstOrDefaultAsync(
            x => x.TripId == tripId && x.AccountId == accountId, ct);
        if (assignment is null) return NotFound();

        db.TripStaff.Remove(assignment);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Remove trip staff", AuditActionType.Delete, $"TRIP-{tripId}", ct: ct);
        return NoContent();
    }
}
