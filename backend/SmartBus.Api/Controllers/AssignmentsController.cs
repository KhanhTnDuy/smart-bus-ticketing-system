using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;
using SmartBus.Api.DTOs;
using SmartBus.Api.Models;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly SmartBusDbContext _db;
    public AssignmentsController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var data = await _db.TripAssignments.AsNoTracking()
            .Include(x => x.Bus)
            .Include(x => x.Driver)
            .Include(x => x.Assistant)
            .Include(x => x.Trip)
            .OrderBy(x => x.Trip!.DepartureTime)
            .Select(x => new
            {
                x.Id, x.TripId, x.BusId,
                BusCode = x.Bus!.Code,
                DriverId = x.DriverId,
                DriverName = x.Driver!.FullName,
                AssistantId = x.AssistantId,
                AssistantName = x.Assistant == null ? null : x.Assistant.FullName,
                RouteName = x.Trip!.RouteName,
                x.Trip.DepartureTime,
                x.Trip.ArrivalTime
            }).ToListAsync();
        return Ok(data);
    }

    [HttpGet("trip/{tripId:int}")]
    public async Task<IActionResult> GetByTrip(int tripId)
    {
        var data = await _db.TripAssignments.AsNoTracking()
            .Include(x => x.Bus).Include(x => x.Driver).Include(x => x.Assistant)
            .FirstOrDefaultAsync(x => x.TripId == tripId);
        if (data is null) return NotFound(new { message = "Chuyến chưa được phân công." });
        return Ok(new
        {
            data.Id, data.TripId, data.BusId, BusCode = data.Bus!.Code,
            data.DriverId, DriverName = data.Driver!.FullName,
            data.AssistantId, AssistantName = data.Assistant?.FullName,
            data.AssignedAt
        });
    }

    [HttpPost("trip/{tripId:int}")]
    public async Task<IActionResult> Assign(int tripId, AssignmentRequest request)
    {
        var trip = await _db.Trips.FindAsync(tripId);
        if (trip is null) return NotFound(new { message = "Không tìm thấy chuyến." });
        if (await _db.TripAssignments.AnyAsync(x => x.TripId == tripId))
            return Conflict(new { message = "Chuyến này đã được phân công." });

        var bus = await _db.Buses.FindAsync(request.BusId);
        if (bus is null || !bus.Active)
            return BadRequest(new { message = "Xe không tồn tại hoặc đang bị vô hiệu hóa." });

        var driver = request.DriverId > 0
            ? await _db.Drivers.FindAsync(request.DriverId)
            : await _db.Drivers.FirstOrDefaultAsync(x => x.FullName == request.DriverName);
        if (driver is null || !driver.Active)
            return BadRequest(new { message = "Tài xế không tồn tại hoặc đang bị vô hiệu hóa." });

        Assistant? assistant = null;
        if (request.AssistantId.HasValue || !string.IsNullOrWhiteSpace(request.AssistantName))
        {
            assistant = request.AssistantId.HasValue
                ? await _db.Assistants.FindAsync(request.AssistantId.Value)
                : await _db.Assistants.FirstOrDefaultAsync(x => x.FullName == request.AssistantName);
            if (assistant is null || !assistant.Active)
                return BadRequest(new { message = "Phụ xe không tồn tại hoặc đang bị vô hiệu hóa." });
        }

        var conflict = await FindConflict(trip, bus.Id, driver.Id, assistant?.Id);
        if (conflict is not null) return Conflict(new { message = conflict });

        var assignment = new TripAssignment
        {
            TripId = tripId, BusId = bus.Id, DriverId = driver.Id, AssistantId = assistant?.Id
        };
        _db.TripAssignments.Add(assignment);
        trip.Status = "ASSIGNED";
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetByTrip), new { tripId }, new
        {
            assignment.Id, assignment.TripId, assignment.BusId,
            assignment.DriverId, assignment.AssistantId, assignment.AssignedAt
        });
    }

    [HttpDelete("trip/{tripId:int}")]
    public async Task<IActionResult> Remove(int tripId)
    {
        var assignment = await _db.TripAssignments.FirstOrDefaultAsync(x => x.TripId == tripId);
        if (assignment is null) return NotFound();
        var trip = await _db.Trips.FindAsync(tripId);
        if (trip is not null) trip.Status = "PLANNED";
        _db.TripAssignments.Remove(assignment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<string?> FindConflict(Trip trip, int busId, int driverId, int? assistantId)
    {
        var query = _db.TripAssignments.Include(x => x.Trip).Where(x =>
            x.Trip != null &&
            x.Trip.DepartureTime < trip.ArrivalTime &&
            trip.DepartureTime < x.Trip.ArrivalTime);

        if (await query.AnyAsync(x => x.BusId == busId))
            return "Xe đã có chuyến khác bị trùng thời gian.";
        if (await query.AnyAsync(x => x.DriverId == driverId))
            return "Tài xế đã có chuyến khác bị trùng thời gian.";
        if (assistantId.HasValue && await query.AnyAsync(x => x.AssistantId == assistantId.Value))
            return "Phụ xe đã có chuyến khác bị trùng thời gian.";
        return null;
    }
}
