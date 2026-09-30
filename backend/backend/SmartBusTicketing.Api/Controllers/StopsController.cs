using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/stops")]
public class StopsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await db.Stops.AsNoTracking().OrderBy(s => s.Name).ToListAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) { var stop = await db.Stops.FindAsync([id], ct); return stop is null ? NotFound() : Ok(stop); }

    [HttpPost]
    public async Task<IActionResult> Create(StopRequest request, CancellationToken ct)
    {
        var stop = new Stop { Name = request.Name.Trim(), Latitude = request.Latitude, Longitude = request.Longitude }; db.Stops.Add(stop); await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Create stop", AuditActionType.Create, $"STOP-{stop.Id}", ct: ct); return CreatedAtAction(nameof(Get), new { id = stop.Id }, stop);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, StopRequest request, CancellationToken ct)
    {
        var stop = await db.Stops.FindAsync([id], ct); if (stop is null) return NotFound(); stop.Name = request.Name.Trim(); stop.Latitude = request.Latitude; stop.Longitude = request.Longitude; await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Update stop", AuditActionType.Update, $"STOP-{id}", ct: ct); return Ok(stop);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var stop = await db.Stops.FindAsync([id], ct); if (stop is null) return NotFound();
        if (await db.RouteStops.AnyAsync(x => x.StopId == id, ct)) return Conflict(new { message = "Không thể xóa trạm đang thuộc tuyến." });
        db.Stops.Remove(stop); await db.SaveChangesAsync(ct); await audit.WriteAsync(GetActorId(), GetActorName(), "Delete stop", AuditActionType.Delete, $"STOP-{id}", ct: ct); return NoContent();
    }
    private long? GetActorId() => Request.Headers.TryGetValue("X-User-Id", out var raw) && long.TryParse(raw, out var id) ? id : null;
    private string GetActorName() => Request.Headers.TryGetValue("X-Username", out var raw) ? raw.ToString() : "system";
}
