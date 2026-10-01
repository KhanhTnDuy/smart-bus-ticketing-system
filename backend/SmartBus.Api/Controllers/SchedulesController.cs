using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;
using SmartBus.Api.DTOs;
using SmartBus.Api.Models;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/schedules")]
public class SchedulesController : ControllerBase
{
    private readonly SmartBusDbContext _db;

    public SchedulesController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ScheduleResponse>>> GetAll()
    {
        var data = await _db.Schedules
            .OrderBy(x => x.RouteName)
            .Select(x => new ScheduleResponse(
                x.Id, x.RouteId, x.RouteName, x.StartPoint, x.EndPoint,
                x.StartTime, x.EndTime, x.FrequencyMinutes,
                x.DaysOfWeek, x.Fare, x.Active))
            .ToListAsync();

        return Ok(data);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ScheduleResponse>> GetById(int id)
    {
        var x = await _db.Schedules.FindAsync(id);
        if (x is null) return NotFound(new { message = "Không tìm thấy lịch trình." });

        return Ok(ToResponse(x));
    }

    [HttpPost]
    public async Task<ActionResult<ScheduleResponse>> Create(ScheduleRequest request)
    {
        if (request.FrequencyMinutes <= 0)
            return BadRequest(new { message = "FrequencyMinutes phải lớn hơn 0." });

        if (request.StartTime >= request.EndTime)
            return BadRequest(new { message = "Giờ bắt đầu phải nhỏ hơn giờ kết thúc." });

        if (request.RouteId.HasValue && !await _db.Routes.AnyAsync(x => x.Id == request.RouteId.Value && x.Active))
            return BadRequest(new { message = "Route không tồn tại hoặc đang bị vô hiệu hóa." });

        var entity = new Schedule
        {
            RouteId = request.RouteId,
            RouteName = request.RouteName.Trim(),
            StartPoint = request.StartPoint.Trim(),
            EndPoint = request.EndPoint.Trim(),
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            FrequencyMinutes = request.FrequencyMinutes,
            DaysOfWeek = request.DaysOfWeek,
            Fare = request.Fare,
            Active = request.Active
        };

        _db.Schedules.Add(entity);
        await _db.SaveChangesAsync();

        await WriteAudit("CREATE", "Schedule", entity.Id, $"Tạo lịch {entity.RouteName}");

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ToResponse(entity));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ScheduleResponse>> Update(int id, ScheduleRequest request)
    {
        var entity = await _db.Schedules.FindAsync(id);
        if (entity is null) return NotFound();

        if (request.FrequencyMinutes <= 0 || request.StartTime >= request.EndTime)
            return BadRequest(new { message = "Thông tin thời gian biểu không hợp lệ." });

        if (request.RouteId.HasValue && !await _db.Routes.AnyAsync(x => x.Id == request.RouteId.Value && x.Active))
            return BadRequest(new { message = "Route không tồn tại hoặc đang bị vô hiệu hóa." });

        entity.RouteId = request.RouteId;
        entity.RouteName = request.RouteName.Trim();
        entity.StartPoint = request.StartPoint.Trim();
        entity.EndPoint = request.EndPoint.Trim();
        entity.StartTime = request.StartTime;
        entity.EndTime = request.EndTime;
        entity.FrequencyMinutes = request.FrequencyMinutes;
        entity.DaysOfWeek = request.DaysOfWeek;
        entity.Fare = request.Fare;
        entity.Active = request.Active;

        await _db.SaveChangesAsync();
        await WriteAudit("UPDATE", "Schedule", entity.Id, $"Cập nhật lịch {entity.RouteName}");

        return Ok(ToResponse(entity));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.Schedules.FindAsync(id);
        if (entity is null) return NotFound();

        entity.Active = false;
        await _db.SaveChangesAsync();
        await WriteAudit("DELETE", "Schedule", id, "Vô hiệu hóa lịch trình");

        return NoContent();
    }

    [HttpPost("{id:int}/generate-trips")]
    public async Task<IActionResult> GenerateTrips(int id, GenerateTripsRequest request)
    {
        var schedule = await _db.Schedules.FindAsync(id);
        if (schedule is null) return NotFound(new { message = "Không tìm thấy lịch trình." });

        var date = request.Date.Date;
        var dayCode = GetDayCode(date.DayOfWeek);

        if (!schedule.DaysOfWeek.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(dayCode, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = $"Lịch không chạy vào {dayCode}." });
        }

        var created = 0;
        var time = schedule.StartTime;

        while (time <= schedule.EndTime)
        {
            var departure = date.Add(time);

            var exists = await _db.Trips.AnyAsync(x =>
                x.ScheduleId == id && x.DepartureTime == departure);

            if (!exists)
            {
                _db.Trips.Add(new Trip
                {
                    ScheduleId = id,
                    RouteName = schedule.RouteName,
                    StartPoint = schedule.StartPoint,
                    EndPoint = schedule.EndPoint,
                    DepartureTime = departure,
                    ArrivalTime = departure.AddMinutes(45),
                    Fare = schedule.Fare,
                    Status = "PLANNED"
                });
                created++;
            }

            time = time.Add(TimeSpan.FromMinutes(schedule.FrequencyMinutes));
        }

        await _db.SaveChangesAsync();
        await WriteAudit("GENERATE_TRIPS", "Schedule", id, $"Tạo {created} chuyến cho {date:yyyy-MM-dd}");

        return Ok(new { scheduleId = id, date = date.ToString("yyyy-MM-dd"), created });
    }

    private static string GetDayCode(DayOfWeek day) => day switch
    {
        DayOfWeek.Monday => "MON",
        DayOfWeek.Tuesday => "TUE",
        DayOfWeek.Wednesday => "WED",
        DayOfWeek.Thursday => "THU",
        DayOfWeek.Friday => "FRI",
        DayOfWeek.Saturday => "SAT",
        _ => "SUN"
    };

    private static ScheduleResponse ToResponse(Schedule x) =>
        new(x.Id, x.RouteId, x.RouteName, x.StartPoint, x.EndPoint, x.StartTime,
            x.EndTime, x.FrequencyMinutes, x.DaysOfWeek, x.Fare, x.Active);

    private async Task WriteAudit(string action, string entity, int id, string details)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            EntityName = entity,
            EntityId = id,
            Details = details
        });
        await _db.SaveChangesAsync();
    }
}
