using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/trips")]
[Authorize]
public sealed class TripsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] long? routeId,
        [FromQuery] long? busId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] TripStatus? status,
        CancellationToken ct)
    {
        var q = db.Trips.AsNoTracking();
        if (routeId.HasValue) q = q.Where(t => t.RouteId == routeId.Value);
        if (busId.HasValue) q = q.Where(t => t.BusId == busId.Value);
        if (from.HasValue) q = q.Where(t => t.DepartureAt >= from.Value);
        if (to.HasValue) q = q.Where(t => t.DepartureAt <= to.Value);
        if (status.HasValue) q = q.Where(t => t.Status == status.Value);

        return Ok(await q.OrderBy(t => t.DepartureAt)
            .Select(t => new
            {
                t.Id, t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                t.ScheduleId, t.BusId,
                PlateNumber = t.Bus != null ? t.Bus.PlateNumber : null,
                t.DepartureAt, t.Status, t.DelayMinutes,
                Staff = t.TripStaff.Select(s => new { s.AccountId, s.Account.FullName, s.Account.Username, s.Duty }).ToList()
            }).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var trip = await db.Trips.AsNoTracking().Where(t => t.Id == id)
            .Select(t => new
            {
                t.Id, t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                t.ScheduleId, t.BusId,
                PlateNumber = t.Bus != null ? t.Bus.PlateNumber : null,
                t.DepartureAt, t.Status, t.DelayMinutes,
                Staff = t.TripStaff.Select(s => new { s.AccountId, s.Account.FullName, s.Account.Username, s.Duty }).ToList()
            }).FirstOrDefaultAsync(ct);
        return trip is null ? NotFound() : Ok(trip);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(TripRequest request, CancellationToken ct)
    {
        if (!await db.BusRoutes.AnyAsync(r => r.Id == request.RouteId && r.Active, ct))
            return BadRequest(new { message = "Tuyến không tồn tại hoặc đang ngừng hoạt động." });

        if (request.ScheduleId.HasValue &&
            !await db.Schedules.AnyAsync(s => s.Id == request.ScheduleId.Value && s.RouteId == request.RouteId, ct))
            return BadRequest(new { message = "Schedule không tồn tại hoặc không thuộc tuyến đã chọn." });

        if (request.BusId.HasValue)
        {
            var bus = await db.Buses.FindAsync([request.BusId.Value], ct);
            if (bus is null) return BadRequest(new { message = "Xe không tồn tại." });
            if (bus.Status != BusStatus.Active) return BadRequest(new { message = "Xe không ở trạng thái Active." });
            if (await db.Trips.AnyAsync(t => t.BusId == request.BusId && t.DepartureAt == request.DepartureAt &&
                t.Status != TripStatus.Cancelled, ct))
                return Conflict(new { message = "Xe đã được gán cho một chuyến khác cùng thời điểm." });
        }

        var trip = new Trip
        {
            RouteId = request.RouteId,
            ScheduleId = request.ScheduleId,
            BusId = request.BusId,
            DepartureAt = request.DepartureAt,
            Status = request.Status,
            DelayMinutes = request.DelayMinutes
        };
        db.Trips.Add(trip);
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is MySqlException { Number: 1062 })
        {
            return Conflict(new { message = "Xe đã được gán cho một chuyến khác cùng thời điểm." });
        }

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Create trip", AuditActionType.Create, $"TRIP-{trip.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = trip.Id }, new
        {
            trip.Id, trip.RouteId, trip.ScheduleId, trip.BusId,
            trip.DepartureAt, trip.Status, trip.DelayMinutes
        });
    }

    [HttpPut("{id:long}/bus")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> AssignBus(long id, AssignBusRequest request, CancellationToken ct)
    {
        var trip = await db.Trips.FindAsync([id], ct);
        if (trip is null) return NotFound();

        var bus = await db.Buses.FindAsync([request.BusId], ct);
        if (bus is null) return BadRequest(new { message = "Xe không tồn tại." });
        if (bus.Status != BusStatus.Active) return BadRequest(new { message = "Xe không ở trạng thái Active." });

        if (await db.Trips.AnyAsync(t => t.Id != id && t.BusId == request.BusId &&
            t.DepartureAt == trip.DepartureAt && t.Status != TripStatus.Cancelled, ct))
            return Conflict(new { message = "Xe đã được gán cho chuyến khác cùng thời điểm." });

        trip.BusId = request.BusId;
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is MySqlException { Number: 1062 })
        {
            return Conflict(new { message = "Xe đã được gán cho chuyến khác cùng thời điểm." });
        }
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Assign bus to trip", AuditActionType.Update, $"TRIP-{id}", ct: ct);
        return Ok(new { trip.Id, trip.BusId, bus.PlateNumber });
    }

    [HttpPatch("{id:long}/status")]
    [Authorize(Roles = "Admin,Manager,Driver,Conductor")]
    public async Task<IActionResult> UpdateStatus(long id, UpdateTripStatusRequest request, CancellationToken ct)
    {
        var trip = await db.Trips.FindAsync([id], ct);
        if (trip is null) return NotFound();

        if (request.Status == TripStatus.Running && trip.BusId is null)
            return BadRequest(new { message = "Chuyến phải được gán xe trước khi chạy." });

        var actorId = User.AccountId();
        if (User.IsInRole(AccountRole.Driver.ToString()) || User.IsInRole(AccountRole.Conductor.ToString()))
        {
            if (!actorId.HasValue)
                return Unauthorized();

            var duty = User.IsInRole(AccountRole.Driver.ToString()) ? StaffDuty.Driver : StaffDuty.Conductor;
            var assigned = await db.TripStaff.AnyAsync(x =>
                x.TripId == id && x.AccountId == actorId.Value && x.Duty == duty, ct);
            if (!assigned)
                return Forbid();
        }

        var old = trip.Status;
        trip.Status = request.Status;
        trip.DelayMinutes = request.DelayMinutes;
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            $"Trip status {old} -> {request.Status}", AuditActionType.StatusChange, $"TRIP-{id}", ct: ct);
        return Ok(new { trip.Id, trip.Status, trip.DelayMinutes });
    }

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Cancel(long id, CancellationToken ct)
    {
        var trip = await db.Trips.FindAsync([id], ct);
        if (trip is null) return NotFound();

        if (trip.Status == TripStatus.Running || trip.Status == TripStatus.Completed)
            return Conflict(new { message = "Không thể hủy chuyến đang chạy hoặc đã hoàn thành." });

        trip.Status = TripStatus.Cancelled;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
            "Cancel trip", AuditActionType.Delete, $"TRIP-{id}", ct: ct);
        return NoContent();
    }
}
