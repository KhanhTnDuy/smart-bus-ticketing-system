using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/feedback")]
public class FeedbackController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] FeedbackStatus? status, CancellationToken ct)
    {
        var q = db.Feedbacks.AsNoTracking().Include(f => f.Passenger).Include(f => f.BusRoute).AsQueryable(); if (status.HasValue) q = q.Where(f => f.Status == status.Value); return Ok(await q.OrderByDescending(f => f.Id).ToListAsync(ct));
    }
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) { var f = await db.Feedbacks.AsNoTracking().Include(x => x.Passenger).Include(x => x.BusRoute).Include(x => x.History).FirstOrDefaultAsync(x => x.Id == id, ct); return f is null ? NotFound() : Ok(f); }
    [HttpPost]
    public async Task<IActionResult> Create(FeedbackRequest request, CancellationToken ct)
    {
        if (!await db.Accounts.AnyAsync(a => a.Id == request.PassengerId && a.Role == AccountRole.Passenger, ct)) return BadRequest(new { message = "Passenger không tồn tại hoặc không có role Passenger." });
        var f = new Feedback { PassengerId = request.PassengerId, RouteId = request.RouteId, TripId = request.TripId, Type = request.Type, Subject = request.Subject.Trim(), Rating = request.Rating, ImagePath = request.ImagePath, Status = FeedbackStatus.ChuaXuLy };
        db.Feedbacks.Add(f); await db.SaveChangesAsync(ct); await audit.WriteAsync(request.PassengerId, (await db.Accounts.FindAsync([request.PassengerId], ct))?.Username ?? "passenger", "Submit feedback", AuditActionType.FeedbackSubmit, $"FEEDBACK-{f.Id}", ct: ct); return CreatedAtAction(nameof(Get), new { id = f.Id }, f);
    }
    [HttpPatch("{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(long id, FeedbackStatusRequest request, CancellationToken ct)
    {
        var f = await db.Feedbacks.FindAsync([id], ct); if (f is null) return NotFound(); var actorId = GetActorId(); var old = f.Status; if (old == request.Status) return Ok(f);
        f.Status = request.Status; f.ProcessedBy = actorId; var h = new FeedbackHistory { FeedbackId = f.Id, OldStatus = old, NewStatus = request.Status, ChangedBy = actorId ?? 0, ChangedAt = DateTime.UtcNow }; if (actorId.HasValue) db.FeedbackHistories.Add(h); await db.SaveChangesAsync(ct);
        await audit.WriteAsync(actorId, GetActorName(), $"Feedback status {old} -> {request.Status}", AuditActionType.StatusChange, $"FEEDBACK-{id}", ct: ct); return Ok(f);
    }
    private long? GetActorId() => Request.Headers.TryGetValue("X-User-Id", out var raw) && long.TryParse(raw, out var id) ? id : null;
    private string GetActorName() => Request.Headers.TryGetValue("X-Username", out var raw) ? raw.ToString() : "manager";
}
