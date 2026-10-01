using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize]
public sealed class SchedulesController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] long? routeId, CancellationToken ct)
    {
        var q = db.Schedules.AsNoTracking();
        if (routeId.HasValue) q = q.Where(s => s.RouteId == routeId.Value);

        return Ok(await q.OrderBy(s => s.RouteId).ThenBy(s => s.FirstDeparture)
            .Select(s => new
            {
                s.Id, s.RouteId,
                RouteCode = s.BusRoute.Code,
                RouteName = s.BusRoute.Name,
                s.FirstDeparture, s.LastDeparture, s.FrequencyMinutes, s.DaysOfWeek
            }).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var item = await db.Schedules.AsNoTracking().Where(s => s.Id == id)
            .Select(s => new
            {
                s.Id, s.RouteId,
                RouteCode = s.BusRoute.Code,
                RouteName = s.BusRoute.Name,
                s.FirstDeparture, s.LastDeparture, s.FrequencyMinutes, s.DaysOfWeek
            }).FirstOrDefaultAsync(ct);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(ScheduleRequest request, CancellationToken ct)
    {
        var validation = await ValidateRequest(request, ct);
        if (validation is not null) return validation;

        var schedule = new Schedule
        {
            RouteId = request.RouteId,
            FirstDeparture = request.FirstDeparture,
            LastDeparture = request.LastDeparture,
            FrequencyMinutes = request.FrequencyMinutes,
            DaysOfWeek = request.DaysOfWeek.Trim()
        };
        db.Schedules.Add(schedule);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Create schedule", AuditActionType.Create, $"SCHEDULE-{schedule.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = schedule.Id }, new
        {
            schedule.Id, schedule.RouteId, schedule.FirstDeparture, schedule.LastDeparture,
            schedule.FrequencyMinutes, schedule.DaysOfWeek
        });
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(long id, ScheduleRequest request, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return NotFound();

        var validation = await ValidateRequest(request, ct);
        if (validation is not null) return validation;

        schedule.RouteId = request.RouteId;
        schedule.FirstDeparture = request.FirstDeparture;
        schedule.LastDeparture = request.LastDeparture;
        schedule.FrequencyMinutes = request.FrequencyMinutes;
        schedule.DaysOfWeek = request.DaysOfWeek.Trim();
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Update schedule", AuditActionType.Update, $"SCHEDULE-{id}", ct: ct);
        return Ok(new
        {
            schedule.Id, schedule.RouteId, schedule.FirstDeparture, schedule.LastDeparture,
            schedule.FrequencyMinutes, schedule.DaysOfWeek
        });
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return NotFound();

        if (await db.Trips.AnyAsync(t => t.ScheduleId == id && t.Status != TripStatus.Cancelled, ct))
            return Conflict(new { message = "Lịch đã sinh chuyến nên không thể xóa." });

        db.Schedules.Remove(schedule);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Delete schedule", AuditActionType.Delete, $"SCHEDULE-{id}", ct: ct);
        return NoContent();
    }

    private async Task<IActionResult?> ValidateRequest(ScheduleRequest request, CancellationToken ct)
    {
        if (!await db.BusRoutes.AnyAsync(r => r.Id == request.RouteId && r.Active, ct))
            return BadRequest(new { message = "Tuyến không tồn tại hoặc đang ngừng hoạt động." });

        if (request.FirstDeparture > request.LastDeparture)
            return BadRequest(new { message = "Giờ khởi hành đầu phải nhỏ hơn hoặc bằng giờ khởi hành cuối." });

        if (string.IsNullOrWhiteSpace(request.DaysOfWeek))
            return BadRequest(new { message = "DaysOfWeek không được để trống." });

        return null;
    }
}
