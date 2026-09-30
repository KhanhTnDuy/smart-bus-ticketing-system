using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// US4 - Phản ánh và đánh giá chuyến đi.
/// Hành khách gửi phản ánh của chính mình; Admin và Quản lý xem danh sách và xử lý.
/// </summary>
[ApiController]
[Route("api/feedback")]
[Authorize]
public class FeedbackController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet, Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAll([FromQuery] FeedbackStatus? status, CancellationToken ct)
    {
        var q = db.Feedbacks.AsNoTracking().Include(f => f.Passenger).Include(f => f.BusRoute).AsQueryable();
        if (status.HasValue) q = q.Where(f => f.Status == status.Value);
        return Ok(await q.OrderByDescending(f => f.Id).ToListAsync(ct));
    }

    /// <summary>Hành khách chỉ xem được phản ánh của chính mình; Admin và Quản lý xem được tất cả.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var f = await db.Feedbacks.AsNoTracking().Include(x => x.Passenger).Include(x => x.BusRoute)
            .Include(x => x.History).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (f is null) return NotFound();

        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && f.PassengerId != User.AccountId()) return Forbid();

        return Ok(f);
    }

    /// <summary>
    /// Gửi phản ánh hoặc đánh giá. Hành khách được lấy từ JWT, không nhận PassengerId
    /// từ body để một tài khoản không thể gửi phản ánh thay người khác.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(FeedbackRequest request, CancellationToken ct)
    {
        var passengerId = User.AccountId();
        if (passengerId is null) return Unauthorized();

        if (!await db.Accounts.AnyAsync(a => a.Id == passengerId && a.Role == AccountRole.Passenger, ct))
            return BadRequest(new { message = "Chỉ tài khoản có vai trò Hành khách mới gửi được phản ánh." });

        // Đánh giá chuyến đi thì số sao là bắt buộc (SCRUM-21).
        if (request.Type == FeedbackType.Review && request.Rating is < 1 or > 5)
            return BadRequest(new { message = "Đánh giá chuyến đi phải có số sao từ 1 đến 5." });

        // Khiếu nại thì nội dung là bắt buộc; đánh giá có thể chỉ có số sao.
        if (request.Type == FeedbackType.Complaint && string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "Nội dung khiếu nại không được để trống." });

        if (request.RouteId is not null && !await db.BusRoutes.AnyAsync(r => r.Id == request.RouteId, ct))
            return BadRequest(new { message = "Tuyến đường không tồn tại." });

        if (request.TripId is not null && !await db.Trips.AnyAsync(t => t.Id == request.TripId, ct))
            return BadRequest(new { message = "Chuyến xe không tồn tại." });

        var f = new Feedback
        {
            PassengerId = passengerId.Value,
            RouteId = request.RouteId,
            TripId = request.TripId,
            Type = request.Type,
            Subject = request.Subject.Trim(),
            Content = request.Content?.Trim() ?? string.Empty,
            Rating = request.Rating,
            ImagePath = request.ImagePath,
            Status = FeedbackStatus.ChuaXuLy,
        };

        db.Feedbacks.Add(f);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(passengerId, User.Username() ?? "passenger", "Submit feedback",
            AuditActionType.FeedbackSubmit, $"FEEDBACK-{f.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = f.Id }, f);
    }

    [HttpPatch("{id:long}/status"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateStatus(long id, FeedbackStatusRequest request, CancellationToken ct)
    {
        var f = await db.Feedbacks.FindAsync([id], ct);
        if (f is null) return NotFound();

        var actorId = User.AccountId();
        var old = f.Status;
        if (old == request.Status) return Ok(f);

        f.Status = request.Status;
        f.ProcessedBy = actorId;
        if (actorId.HasValue)
        {
            db.FeedbackHistories.Add(new FeedbackHistory
            {
                FeedbackId = f.Id, OldStatus = old, NewStatus = request.Status,
                ChangedBy = actorId.Value, ChangedAt = DateTime.UtcNow,
            });
        }
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(actorId, User.Username() ?? "manager",
            $"Feedback status {old} -> {request.Status}", AuditActionType.StatusChange, $"FEEDBACK-{id}", ct: ct);
        return Ok(f);
    }
}
