using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// SCRUM-44 - Quản lý lịch trình (giờ đầu, giờ cuối, tần suất, ngày chạy).
/// SCRUM-45 - Sinh chuyến xe từ lịch trình.
/// Chỉ Admin và Quản lý được xem / thao tác.
/// </summary>
[ApiController]
[Route("api/schedules")]
[Authorize(Roles = "Admin,Manager")]
public sealed class SchedulesController(IScheduleManagementService service, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ScheduleDto>>> Get([FromQuery] long? routeId, CancellationToken ct)
        => Ok(await service.GetSchedulesAsync(routeId, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<ScheduleDto>> GetById(long id, CancellationToken ct)
    {
        var schedule = await service.GetScheduleAsync(id, ct);
        return schedule is null ? NotFound() : Ok(schedule);
    }

    [HttpPost]
    public async Task<ActionResult<ScheduleDto>> Create(ScheduleRequest request, CancellationToken ct)
    {
        var result = await service.CreateScheduleAsync(request, ct);
        if (!result.Ok) return this.ToProblem(result);

        var s = result.Value!;
        await audit.LogAsync(this, $"Tạo lịch trình tuyến {s.RouteCode} ({s.FirstDeparture} - {s.LastDeparture}, {s.FrequencyMinutes} phút/chuyến)",
            AuditActionType.Create, $"SCHEDULE-{s.Id}", ct);
        return CreatedAtAction(nameof(GetById), new { id = s.Id }, s);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ScheduleDto>> Update(long id, ScheduleRequest request, CancellationToken ct)
    {
        var result = await service.UpdateScheduleAsync(id, request, ct);
        if (!result.Ok) return this.ToProblem(result);

        var s = result.Value!;
        await audit.LogAsync(this, $"Cập nhật lịch trình tuyến {s.RouteCode} ({s.FirstDeparture} - {s.LastDeparture}, {s.FrequencyMinutes} phút/chuyến)",
            AuditActionType.Update, $"SCHEDULE-{id}", ct);
        return Ok(s);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var before = await service.GetScheduleAsync(id, ct);
        var result = await service.DeleteScheduleAsync(id, ct);
        if (!result.Ok) return this.ToProblem(result);

        await audit.LogAsync(this, $"Xóa lịch trình tuyến {before?.RouteCode ?? id.ToString()}", AuditActionType.Delete, $"SCHEDULE-{id}", ct);
        return NoContent();
    }

    // ----- SCRUM-45: chuyến sinh từ lịch trình -----

    /// <summary>Danh sách chuyến của lịch trình trong khoảng ngày (mặc định 14 ngày kể từ hôm nay).</summary>
    [HttpGet("{id:long}/trips")]
    public async Task<ActionResult<IReadOnlyList<ScheduleTripDto>>> GetTrips(long id, [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to, CancellationToken ct)
    {
        var result = await service.GetTripsAsync(id, from, to, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }

    /// <summary>
    /// Sinh chuyến theo tần suất cho khoảng ngày. Chuyến đã tồn tại (cùng lịch trình, cùng giờ xuất bến)
    /// được bỏ qua nên gọi lại nhiều lần không tạo trùng. Đặt dryRun = true để xem trước, không ghi dữ liệu.
    /// </summary>
    [HttpPost("{id:long}/generate-trips")]
    public async Task<ActionResult<GenerateTripsResult>> GenerateTrips(long id, GenerateTripsRequest request, CancellationToken ct)
    {
        var result = await service.GenerateTripsAsync(id, request, ct);
        if (!result.Ok) return this.ToProblem(result);

        if (!request.DryRun)
        {
            await audit.LogAsync(this,
                $"Sinh {result.Value!.Created} chuyến từ lịch trình ({request.FromDate:yyyy-MM-dd} đến {request.ToDate:yyyy-MM-dd}), bỏ qua {result.Value.Skipped} chuyến đã có",
                AuditActionType.Create, $"SCHEDULE-{id}", ct);
        }
        return Ok(result.Value);
    }
}
