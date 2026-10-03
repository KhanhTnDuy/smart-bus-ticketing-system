using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// SCRUM-44 - Quản lý lịch trình (giờ đầu, giờ cuối, tần suất, ngày chạy).
/// SCRUM-45 - Sinh chuyến xe từ lịch trình.
/// SCRUM-47 - Chỉ Admin và Quản lý được thao tác; mọi thay đổi lịch trình đều ghi nhật ký,
/// kể cả thao tác bị từ chối, để trang Nhật ký hệ thống truy được ai đổi gì lúc nào.
/// Target của nhật ký dùng tiền tố SCHEDULE- (xem auditModuleOf trong frontend/src/api/mappers.ts).
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
        if (!result.Ok)
        {
            await audit.LogAsync(this, "Tạo lịch trình thất bại", AuditActionType.Create,
                $"SCHEDULE-ROUTE-{request.RouteId}", ct, result.Message, AuditStatus.Failure);
            return this.ToProblem(result);
        }

        var s = result.Value!;
        await audit.LogAsync(this, $"Tạo lịch trình tuyến {s.RouteCode}", AuditActionType.Create,
            $"SCHEDULE-{s.Id}", ct, Describe(s));
        return CreatedAtAction(nameof(GetById), new { id = s.Id }, s);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<ScheduleDto>> Update(long id, ScheduleRequest request, CancellationToken ct)
    {
        // Đọc trước khi sửa để nhật ký nói được thay đổi từ giá trị nào sang giá trị nào.
        var before = await service.GetScheduleAsync(id, ct);

        var result = await service.UpdateScheduleAsync(id, request, ct);
        if (!result.Ok)
        {
            await audit.LogAsync(this, "Cập nhật lịch trình thất bại", AuditActionType.Update,
                $"SCHEDULE-{id}", ct, result.Message, AuditStatus.Failure);
            return this.ToProblem(result);
        }

        var s = result.Value!;
        await audit.LogAsync(this, $"Cập nhật lịch trình tuyến {s.RouteCode}", AuditActionType.Update,
            $"SCHEDULE-{id}", ct, DescribeChange(before, s));
        return Ok(s);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var before = await service.GetScheduleAsync(id, ct);
        var result = await service.DeleteScheduleAsync(id, ct);
        if (!result.Ok)
        {
            await audit.LogAsync(this, "Xóa lịch trình thất bại", AuditActionType.Delete,
                $"SCHEDULE-{id}", ct, result.Message, AuditStatus.Failure);
            return this.ToProblem(result);
        }

        await audit.LogAsync(this, $"Xóa lịch trình tuyến {before?.RouteCode ?? id.ToString()}",
            AuditActionType.Delete, $"SCHEDULE-{id}", ct,
            before is null ? null : $"Lịch trình đã xóa — {Describe(before)}");
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
        if (!result.Ok)
        {
            if (!request.DryRun)
            {
                await audit.LogAsync(this, "Sinh chuyến từ lịch trình thất bại", AuditActionType.Create,
                    $"SCHEDULE-{id}", ct, result.Message, AuditStatus.Failure);
            }
            return this.ToProblem(result);
        }

        // DryRun chỉ là xem trước, không đổi dữ liệu nên không ghi nhật ký.
        if (!request.DryRun)
        {
            var r = result.Value!;
            await audit.LogAsync(this, $"Sinh {r.Created} chuyến từ lịch trình",
                AuditActionType.Create, $"SCHEDULE-{id}", ct,
                $"Khoảng ngày {request.FromDate:dd/MM/yyyy} - {request.ToDate:dd/MM/yyyy}. " +
                $"Tạo mới {r.Created} chuyến, bỏ qua {r.Skipped} chuyến đã có, " +
                $"bỏ qua {r.SkippedPast} mốc giờ đã trôi qua.");
        }
        return Ok(result.Value);
    }

    // ----- SCRUM-47: mô tả thay đổi để ghi vào nhật ký -----

    private static string Describe(ScheduleDto s) =>
        $"Tuyến {s.RouteCode} ({s.RouteName}), chạy {s.FirstDeparture} - {s.LastDeparture}, " +
        $"{s.FrequencyMinutes} phút/chuyến, các ngày {string.Join(", ", s.DaysOfWeek)}, " +
        $"{s.TripsPerDay} chuyến mỗi ngày chạy";

    /// <summary>Liệt kê những trường thực sự đổi. Không đổi gì thì nói rõ, để nhật ký không gây hiểu nhầm.</summary>
    private static string DescribeChange(ScheduleDto? before, ScheduleDto after)
    {
        if (before is null) return Describe(after);

        var changes = new List<string>();
        if (before.RouteId != after.RouteId)
            changes.Add($"Tuyến: {before.RouteCode} → {after.RouteCode}");
        if (before.FirstDeparture != after.FirstDeparture)
            changes.Add($"Giờ chuyến đầu: {before.FirstDeparture} → {after.FirstDeparture}");
        if (before.LastDeparture != after.LastDeparture)
            changes.Add($"Giờ chuyến cuối: {before.LastDeparture} → {after.LastDeparture}");
        if (before.FrequencyMinutes != after.FrequencyMinutes)
            changes.Add($"Tần suất: {before.FrequencyMinutes} → {after.FrequencyMinutes} phút/chuyến");

        var dayBefore = string.Join(", ", before.DaysOfWeek);
        var dayAfter = string.Join(", ", after.DaysOfWeek);
        if (dayBefore != dayAfter)
            changes.Add($"Ngày chạy: {dayBefore} → {dayAfter}");

        return changes.Count == 0
            ? $"Không có trường nào thay đổi. Hiện tại: {Describe(after)}"
            : string.Join("; ", changes);
    }
}
