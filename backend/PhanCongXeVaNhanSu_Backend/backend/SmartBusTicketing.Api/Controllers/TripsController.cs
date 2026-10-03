using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Quản lý chuyến chạy (Tra cứu chuyến công khai cho hành khách, tạo chuyến mới kèm phân công xe & nhân sự).
/// </summary>
[ApiController]
[Route("api/trips")]
public sealed class TripsController(ITripAssignmentService service, AuditLogService audit) : ControllerBase
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
    /// Tra cứu danh sách chuyến chạy công khai (dành cho hành khách/khách vãng lai, không để lộ thông tin riêng tư của tài xế/phụ xe).
    /// </summary>
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<PagedResponse<PublicTripDto>>> GetTrips(
        [FromQuery] long? routeId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] TripStatus? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new PublicTripFilter
        {
            RouteId = routeId,
            Date = date,
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Status = status,
            Search = search
        };

        var response = await service.GetPublicTripsAsync(filter, page, pageSize, ct);
        return Ok(response);
    }

    /// <summary>
    /// Xem chi tiết chuyến chạy theo ID (thông tin công khai: tuyến, giờ, xe buýt, sức chứa).
    /// </summary>
    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<ActionResult<PublicTripDto>> GetById(long id, CancellationToken ct)
    {
        var dto = await service.GetPublicTripByIdAsync(id, ct);
        return dto is null ? NotFound(new ProblemDetails { Status = 404, Title = $"Không tìm thấy chuyến chạy #{id}." }) : Ok(dto);
    }

    /// <summary>
    /// Tạo mới một chuyến chạy cho tuyến (có thể gán sẵn xe buýt, tài xế và phụ xe ngay khi tạo).
    /// </summary>
    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> Create([FromBody] CreateTripRequest request, CancellationToken ct)
    {
        var result = await service.CreateTripWithAssignmentAsync(request, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Tạo chuyến chạy #{result.Value!.TripId} (Tuyến {result.Value.RouteCode}) lúc {result.Value.DepartureAt:HH:mm dd/MM/yyyy}",
            AuditActionType.Create, $"TRIP-{result.Value.TripId}", null, ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Value.TripId }, result.Value);
    }

    /// <summary>
    /// Cập nhật trạng thái chuyến chạy (Đã lên lịch, Đang chạy, Trễ giờ, Hoàn thành, Đã hủy).
    /// </summary>
    [HttpPut("{id:long}/status"), Authorize(Roles = "Admin,Manager,Driver")]
    public async Task<ActionResult<TripAssignmentDto>> UpdateStatus(long id, [FromBody] UpdateTripStatusRequest request, CancellationToken ct)
    {
        var result = await service.UpdateTripStatusAsync(id, request, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Cập nhật trạng thái chuyến #{id} sang '{result.Value!.StatusText}' (Trễ: {request.DelayMinutes} phút)",
            AuditActionType.StatusChange, $"TRIP-{id}", null, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Xóa chuyến chạy (chỉ xóa được nếu chưa có hành khách nào đặt chỗ hoặc mua vé).
    /// </summary>
    [HttpDelete("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var result = await service.DeleteTripAsync(id, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Xóa chuyến chạy #{id}", AuditActionType.Delete, $"TRIP-{id}", null, ct);
        return NoContent();
    }
}
