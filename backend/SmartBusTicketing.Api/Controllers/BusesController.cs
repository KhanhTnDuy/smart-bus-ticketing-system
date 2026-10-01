using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/buses")]
[Authorize]
public sealed class BusesController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] BusStatus? status, CancellationToken ct)
    {
        var q = db.Buses.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            q = q.Where(b => b.PlateNumber.Contains(value));
        }
        if (status.HasValue) q = q.Where(b => b.Status == status.Value);

        var data = await q.OrderBy(b => b.PlateNumber)
            .Select(b => new
            {
                b.Id, b.PlateNumber, b.Capacity, b.Status,
                SeatCount = b.Seats.Count,
                ActiveTripCount = b.Trips.Count(t => t.Status != TripStatus.Completed && t.Status != TripStatus.Cancelled)
            }).ToListAsync(ct);
        return Ok(data);
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var bus = await db.Buses.AsNoTracking().Where(b => b.Id == id)
            .Select(b => new
            {
                b.Id, b.PlateNumber, b.Capacity, b.Status,
                Seats = b.Seats.OrderBy(s => s.SeatRow).ThenBy(s => s.SeatCol)
                    .Select(s => new { s.Id, s.SeatCode, s.SeatRow, s.SeatCol }).ToList()
            }).FirstOrDefaultAsync(ct);
        return bus is null ? NotFound() : Ok(bus);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(BusRequest request, CancellationToken ct)
    {
        var plate = request.PlateNumber.Trim().ToUpperInvariant();
        if (await db.Buses.AnyAsync(b => b.PlateNumber == plate, ct))
            return Conflict(new { message = "Biển số xe đã tồn tại." });

        var bus = new Bus { PlateNumber = plate, Capacity = request.Capacity, Status = request.Status };
        db.Buses.Add(bus);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Create bus", AuditActionType.Create, $"BUS-{bus.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = bus.Id },
            new { bus.Id, bus.PlateNumber, bus.Capacity, bus.Status });
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(long id, BusRequest request, CancellationToken ct)
    {
        var bus = await db.Buses.FindAsync([id], ct);
        if (bus is null) return NotFound();

        var plate = request.PlateNumber.Trim().ToUpperInvariant();
        if (await db.Buses.AnyAsync(b => b.Id != id && b.PlateNumber == plate, ct))
            return Conflict(new { message = "Biển số xe đã tồn tại." });

        bus.PlateNumber = plate;
        bus.Capacity = request.Capacity;
        bus.Status = request.Status;
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Update bus", AuditActionType.Update, $"BUS-{id}", ct: ct);
        return Ok(new { bus.Id, bus.PlateNumber, bus.Capacity, bus.Status });
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var bus = await db.Buses.FindAsync([id], ct);
        if (bus is null) return NotFound();

        if (await db.Trips.AnyAsync(t => t.BusId == id &&
            t.Status != TripStatus.Completed && t.Status != TripStatus.Cancelled, ct))
            return Conflict(new { message = "Xe đang được sử dụng cho chuyến chưa hoàn thành." });

        // Không xóa cứng xe đã có dữ liệu vận hành.
        bus.Status = BusStatus.Inactive;
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Deactivate bus", AuditActionType.Delete, $"BUS-{id}", ct: ct);
        return NoContent();
    }
}
