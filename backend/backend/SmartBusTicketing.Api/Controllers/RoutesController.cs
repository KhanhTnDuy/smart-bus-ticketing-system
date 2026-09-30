using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/routes")]
public class RoutesController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await db.BusRoutes.AsNoTracking().Include(r => r.RouteStops).ThenInclude(rs => rs.Stop).OrderBy(r => r.Code).ToListAsync(ct));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var route = await db.BusRoutes.AsNoTracking().Include(r => r.RouteStops).ThenInclude(rs => rs.Stop).FirstOrDefaultAsync(r => r.Id == id, ct);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpPost]
    public async Task<IActionResult> Create(RouteRequest request, CancellationToken ct)
    {
        if (await db.BusRoutes.AnyAsync(r => r.Code == request.Code, ct)) return Conflict(new { message = "Mã tuyến đã tồn tại." });
        var route = new BusRoute { Code = request.Code.Trim(), Name = request.Name.Trim(), StartPoint = request.StartPoint.Trim(), EndPoint = request.EndPoint.Trim(), DistanceKm = request.DistanceKm, Active = request.Active };
        db.BusRoutes.Add(route); await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Create route", AuditActionType.Create, $"ROUTE-{route.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = route.Id }, route);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, RouteRequest request, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([id], ct); if (route is null) return NotFound();
        if (await db.BusRoutes.AnyAsync(r => r.Id != id && r.Code == request.Code, ct)) return Conflict(new { message = "Mã tuyến đã tồn tại." });
        route.Code = request.Code.Trim(); route.Name = request.Name.Trim(); route.StartPoint = request.StartPoint.Trim(); route.EndPoint = request.EndPoint.Trim(); route.DistanceKm = request.DistanceKm; route.Active = request.Active;
        await db.SaveChangesAsync(ct); await audit.WriteAsync(GetActorId(), GetActorName(), "Update route", AuditActionType.Update, $"ROUTE-{id}", ct: ct); return Ok(route);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([id], ct); if (route is null) return NotFound(); route.Active = false; await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Deactivate route", AuditActionType.Delete, $"ROUTE-{id}", ct: ct); return NoContent();
    }

    [HttpPut("{id:long}/stops")]
    public async Task<IActionResult> SetStops(long id, List<RouteStopItem> request, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([id], ct); if (route is null) return NotFound();
        if (request.Count == 0 || request.Select(x => x.StopOrder).Distinct().Count() != request.Count) return BadRequest(new { message = "StopOrder phải duy nhất." });
        var stopIds = request.Select(x => x.StopId).ToList();
        if (stopIds.Distinct().Count() != stopIds.Count || await db.Stops.CountAsync(s => stopIds.Contains(s.Id), ct) != stopIds.Count) return BadRequest(new { message = "Danh sách stop không hợp lệ." });
        var current = await db.RouteStops.Where(x => x.RouteId == id).ToListAsync(ct); db.RouteStops.RemoveRange(current);
        db.RouteStops.AddRange(request.OrderBy(x => x.StopOrder).Select(x => new RouteStop { RouteId = id, StopId = x.StopId, StopOrder = x.StopOrder, MinutesFromStart = x.MinutesFromStart }));
        await db.SaveChangesAsync(ct); await audit.WriteAsync(GetActorId(), GetActorName(), "Update route stops", AuditActionType.Update, $"ROUTE-{id}", ct: ct);
        return Ok(await db.RouteStops.AsNoTracking().Include(x => x.Stop).Where(x => x.RouteId == id).OrderBy(x => x.StopOrder).ToListAsync(ct));
    }

    private long? GetActorId() => Request.Headers.TryGetValue("X-User-Id", out var raw) && long.TryParse(raw, out var id) ? id : null;
    private string GetActorName() => Request.Headers.TryGetValue("X-Username", out var raw) ? raw.ToString() : "system";
}
