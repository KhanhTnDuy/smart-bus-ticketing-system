using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/fares")]
public class FaresController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? routeId, CancellationToken ct)
    {
        var q = db.Fares.AsNoTracking().Include(f => f.PassengerType).AsQueryable(); if (routeId.HasValue) q = q.Where(f => f.RouteId == routeId.Value); return Ok(await q.OrderBy(f => f.RouteId).ThenBy(f => f.EffectiveFrom).ToListAsync(ct));
    }
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct) { var f = await db.Fares.AsNoTracking().Include(x => x.PassengerType).FirstOrDefaultAsync(x => x.Id == id, ct); return f is null ? NotFound() : Ok(f); }
    [HttpPost]
    public async Task<IActionResult> Create(FareRequest request, [FromQuery] long routeId, CancellationToken ct)
    {
        if (!await db.BusRoutes.AnyAsync(r => r.Id == routeId, ct)) return BadRequest(new { message = "Route không tồn tại." });
        if (!await db.PassengerTypes.AnyAsync(p => p.Id == request.PassengerTypeId, ct)) return BadRequest(new { message = "PassengerType không tồn tại." });
        var f = new Fare { RouteId = routeId, TicketType = request.TicketType, PassengerTypeId = request.PassengerTypeId, Price = request.Price, EffectiveFrom = request.EffectiveFrom }; db.Fares.Add(f); await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Create fare", AuditActionType.Create, $"FARE-{f.Id}", ct: ct); return CreatedAtAction(nameof(Get), new { id = f.Id }, f);
    }
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, FareRequest request, [FromQuery] long routeId, CancellationToken ct)
    {
        var f = await db.Fares.FindAsync([id], ct); if (f is null) return NotFound(); f.RouteId = routeId; f.TicketType = request.TicketType; f.PassengerTypeId = request.PassengerTypeId; f.Price = request.Price; f.EffectiveFrom = request.EffectiveFrom; await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Update fare", AuditActionType.Update, $"FARE-{id}", ct: ct); return Ok(f);
    }
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct) { var f = await db.Fares.FindAsync([id], ct); if (f is null) return NotFound(); db.Fares.Remove(f); await db.SaveChangesAsync(ct); await audit.WriteAsync(GetActorId(), GetActorName(), "Delete fare", AuditActionType.Delete, $"FARE-{id}", ct: ct); return NoContent(); }
    private long? GetActorId() => Request.Headers.TryGetValue("X-User-Id", out var raw) && long.TryParse(raw, out var id) ? id : null;
    private string GetActorName() => Request.Headers.TryGetValue("X-Username", out var raw) ? raw.ToString() : "system";
}
