using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/buses/{busId:long}/seats")]
[Authorize]
public sealed class SeatsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(long busId, CancellationToken ct)
    {
        if (!await db.Buses.AnyAsync(b => b.Id == busId, ct)) return NotFound(new { message = "Không tìm thấy xe." });
        return Ok(await db.Seats.AsNoTracking()
            .Where(s => s.BusId == busId)
            .OrderBy(s => s.SeatRow).ThenBy(s => s.SeatCol)
            .Select(s => new { s.Id, s.BusId, s.SeatCode, s.SeatRow, s.SeatCol })
            .ToListAsync(ct));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(long busId, SeatRequest request, CancellationToken ct)
    {
        if (!await db.Buses.AnyAsync(b => b.Id == busId, ct)) return NotFound(new { message = "Không tìm thấy xe." });

        var code = request.SeatCode.Trim().ToUpperInvariant();
        if (await db.Seats.AnyAsync(s => s.BusId == busId && s.SeatCode == code, ct))
            return Conflict(new { message = "Mã ghế đã tồn tại trên xe." });

        var seat = new Seat { BusId = busId, SeatCode = code, SeatRow = request.SeatRow, SeatCol = request.SeatCol };
        db.Seats.Add(seat);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Create seat", AuditActionType.Create, $"SEAT-{seat.Id}", ct: ct);
        return Created($"/api/buses/{busId}/seats/{seat.Id}",
            new { seat.Id, seat.BusId, seat.SeatCode, seat.SeatRow, seat.SeatCol });
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(long busId, long id, SeatRequest request, CancellationToken ct)
    {
        var seat = await db.Seats.FirstOrDefaultAsync(s => s.Id == id && s.BusId == busId, ct);
        if (seat is null) return NotFound();

        var code = request.SeatCode.Trim().ToUpperInvariant();
        if (await db.Seats.AnyAsync(s => s.BusId == busId && s.Id != id && s.SeatCode == code, ct))
            return Conflict(new { message = "Mã ghế đã tồn tại trên xe." });

        if (await db.Tickets.AnyAsync(t => t.SeatId == id, ct))
            return Conflict(new { message = "Ghế đã phát sinh vé nên không được thay đổi." });

        seat.SeatCode = code;
        seat.SeatRow = request.SeatRow;
        seat.SeatCol = request.SeatCol;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Update seat", AuditActionType.Update, $"SEAT-{id}", ct: ct);
        return Ok(new { seat.Id, seat.BusId, seat.SeatCode, seat.SeatRow, seat.SeatCol });
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long busId, long id, CancellationToken ct)
    {
        var seat = await db.Seats.FirstOrDefaultAsync(s => s.Id == id && s.BusId == busId, ct);
        if (seat is null) return NotFound();
        if (await db.Tickets.AnyAsync(t => t.SeatId == id, ct))
            return Conflict(new { message = "Ghế đã phát sinh vé nên không thể xóa." });

        db.Seats.Remove(seat);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Delete seat", AuditActionType.Delete, $"SEAT-{id}", ct: ct);
        return NoContent();
    }
}
