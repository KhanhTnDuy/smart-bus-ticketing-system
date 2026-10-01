using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Quản lý đội xe buýt (Danh sách phương tiện, thêm xe mới, cập nhật sức chứa và trạng thái hoạt động / bảo trì).
/// </summary>
[ApiController]
[Route("api/buses")]
public sealed class BusesController(IBusService service, AuditLogService audit) : ControllerBase
{
    private static ActionResult ToProblem<T>(ControllerBase c, ServiceResult<T> r) => r.Error switch
    {
        ServiceError.NotFound => c.NotFound(new ProblemDetails { Status = 404, Title = r.Message }),
        ServiceError.Conflict => c.Conflict(new ProblemDetails { Status = 409, Title = r.Message }),
        _ => c.BadRequest(new ProblemDetails { Status = 400, Title = r.Message })
    };

    private Task LogAuditAsync(string action, AuditActionType type, string target, string? details = null, CancellationToken ct = default) =>
        audit.WriteAsync(User.AccountId(), User.Username() ?? "system", action, type, target, AuditStatus.Success, details, ct);

    /// <summary>
    /// Lấy danh sách xe buýt trong hệ thống (tìm theo biển số, lọc theo trạng thái, phân trang).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<PagedResponse<BusDto>>> GetBuses(
        [FromQuery] string? search,
        [FromQuery] BusStatus? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var response = await service.GetBusesAsync(search, status, page, pageSize, ct);
        return Ok(response);
    }

    /// <summary>
    /// Xem thông tin chi tiết xe buýt theo ID.
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<BusDto>> GetById(long id, CancellationToken ct)
    {
        var dto = await service.GetBusAsync(id, ct);
        return dto is null ? NotFound(new ProblemDetails { Status = 404, Title = $"Không tìm thấy xe buýt #{id}." }) : Ok(dto);
    }

    /// <summary>
    /// Thêm một xe buýt mới vào hệ thống (tự động khởi tạo danh sách ghế ngồi tương ứng sức chứa).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<BusDto>> Create([FromBody] BusRequest request, CancellationToken ct)
    {
        var result = await service.CreateBusAsync(request, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Thêm xe buýt mới {result.Value!.PlateNumber} ({result.Value.Capacity} chỗ)",
            AuditActionType.Create, $"BUS-{result.Value.Id}", null, ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Value.Id }, result.Value);
    }

    /// <summary>
    /// Cập nhật thông tin xe buýt (biển số, sức chứa, trạng thái hoạt động/bảo trì).
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<BusDto>> Update(long id, [FromBody] BusRequest request, CancellationToken ct)
    {
        var result = await service.UpdateBusAsync(id, request, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Cập nhật xe buýt {result.Value!.PlateNumber} (Trạng thái: {result.Value.StatusText})",
            AuditActionType.Update, $"BUS-{id}", null, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Xóa xe buýt (chỉ cho phép xóa khi xe chưa từng được gán vào chuyến chạy nào).
    /// </summary>
    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var result = await service.DeleteBusAsync(id, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Xóa xe buýt #{id}", AuditActionType.Delete, $"BUS-{id}", null, ct);
        return NoContent();
    }
}
