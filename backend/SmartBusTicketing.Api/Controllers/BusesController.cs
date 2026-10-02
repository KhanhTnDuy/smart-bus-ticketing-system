using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>SCRUM-49 - Quản lý xe buýt và sơ đồ ghế. Chỉ Admin và Quản lý được xem / thao tác.</summary>
[ApiController]
[Route("api/buses")]
[Authorize(Roles = "Admin,Manager")]
public sealed class BusesController(IBusManagementService service, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResponse<BusDto>>> Get([FromQuery] string? search, [FromQuery] BusStatus? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await service.GetBusesAsync(search, status, page, pageSize, ct));

    [HttpGet("{id:long}")]
    public async Task<ActionResult<BusDetailDto>> GetById(long id, CancellationToken ct)
    {
        var bus = await service.GetBusAsync(id, ct);
        return bus is null ? NotFound() : Ok(bus);
    }

    [HttpPost]
    public async Task<ActionResult<BusDetailDto>> Create(BusRequest request, CancellationToken ct)
    {
        var result = await service.CreateBusAsync(request, ct);
        if (!result.Ok) return this.ToProblem(result);

        var bus = result.Value!.Bus;
        await audit.LogAsync(this, $"Tạo xe buýt {bus.PlateNumber} ({bus.Capacity} ghế)", AuditActionType.Create, $"BUS-{bus.Id}", ct);
        return CreatedAtAction(nameof(GetById), new { id = bus.Id }, result.Value);
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<BusDetailDto>> Update(long id, BusRequest request, CancellationToken ct)
    {
        var before = await service.GetBusAsync(id, ct);
        var result = await service.UpdateBusAsync(id, request, ct);
        if (!result.Ok) return this.ToProblem(result);

        var bus = result.Value!.Bus;
        var statusChanged = before is not null && before.Bus.Status != bus.Status;
        await audit.LogAsync(this,
            statusChanged ? $"Đổi trạng thái xe {bus.PlateNumber}: {before!.Bus.Status} -> {bus.Status}" : $"Cập nhật xe buýt {bus.PlateNumber}",
            statusChanged ? AuditActionType.StatusChange : AuditActionType.Update, $"BUS-{id}", ct);
        return Ok(result.Value);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var before = await service.GetBusAsync(id, ct);
        var result = await service.DeleteBusAsync(id, ct);
        if (!result.Ok) return this.ToProblem(result);

        await audit.LogAsync(this, $"Xoá xe buýt {before?.Bus.PlateNumber ?? id.ToString()}", AuditActionType.Delete, $"BUS-{id}", ct);
        return NoContent();
    }
}
