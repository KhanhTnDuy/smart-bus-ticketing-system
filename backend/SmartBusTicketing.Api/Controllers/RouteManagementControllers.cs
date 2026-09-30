using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

internal static class ServiceResultExtensions
{
    /// <summary>Đổi lỗi nghiệp vụ thành mã HTTP 404 / 409 / 400 dạng ProblemDetails.</summary>
    public static ActionResult ToProblem<T>(this ControllerBase c, ServiceResult<T> r) => r.Error switch
    {
        ServiceError.NotFound => c.NotFound(new ProblemDetails { Status = 404, Title = r.Message }),
        ServiceError.Conflict => c.Conflict(new ProblemDetails { Status = 409, Title = r.Message }),
        _ => c.BadRequest(new ProblemDetails { Status = 400, Title = r.Message })
    };
}

/// <summary>US3 - Quản lý tuyến đường. Xem: mọi người; thêm/sửa/xóa: Admin, Quản lý.</summary>
[ApiController]
[Route("api/routes")]
public sealed class RoutesController(IRouteManagementService service) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<PagedResponse<RouteDto>>> Get([FromQuery] string? search, [FromQuery] bool? active,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await service.GetRoutesAsync(search, active, page, pageSize, ct));

    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<ActionResult<RouteDto>> GetById(long id, CancellationToken ct)
    {
        var route = await service.GetRouteAsync(id, ct);
        return route is null ? NotFound() : Ok(route);
    }

    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<RouteDto>> Create(RouteRequest request, CancellationToken ct)
    {
        var result = await service.CreateRouteAsync(request, ct);
        return result.Ok ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value) : this.ToProblem(result);
    }

    [HttpPut("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<RouteDto>> Update(long id, RouteRequest request, CancellationToken ct)
    {
        var result = await service.UpdateRouteAsync(id, request, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpDelete("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var result = await service.DeleteRouteAsync(id, ct);
        return result.Ok ? NoContent() : this.ToProblem(result);
    }

    // ----- Trạm dừng của tuyến (thứ tự dừng) -----

    [HttpGet("{id:long}/stops"), AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<RouteStopDto>>> GetStops(long id, CancellationToken ct)
    {
        var result = await service.GetRouteStopsAsync(id, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }

    /// <summary>Thay toàn bộ danh sách trạm của tuyến theo thứ tự gửi lên (thêm, gỡ, sắp xếp lại trong một lần).</summary>
    [HttpPut("{id:long}/stops"), Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<RouteStopDto>>> ReplaceStops(long id, ReplaceRouteStopsRequest request, CancellationToken ct)
    {
        var result = await service.ReplaceRouteStopsAsync(id, request, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }
}

/// <summary>US3 - Quản lý trạm dừng.</summary>
[ApiController]
[Route("api/stops")]
public sealed class StopsController(IRouteManagementService service) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<PagedResponse<StopDto>>> Get([FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
        => Ok(await service.GetStopsAsync(search, page, pageSize, ct));

    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<ActionResult<StopDto>> GetById(long id, CancellationToken ct)
    {
        var stop = await service.GetStopAsync(id, ct);
        return stop is null ? NotFound() : Ok(stop);
    }

    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<StopDto>> Create(StopRequest request, CancellationToken ct)
    {
        var result = await service.CreateStopAsync(request, ct);
        return result.Ok ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value) : this.ToProblem(result);
    }

    [HttpPut("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<StopDto>> Update(long id, StopRequest request, CancellationToken ct)
    {
        var result = await service.UpdateStopAsync(id, request, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpDelete("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var result = await service.DeleteStopAsync(id, ct);
        return result.Ok ? NoContent() : this.ToProblem(result);
    }
}

/// <summary>US3 - Quản lý giá vé theo tuyến.</summary>
[ApiController]
[Route("api/fares")]
public sealed class FaresController(IRouteManagementService service) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<FareDto>>> Get([FromQuery] long? routeId, CancellationToken ct)
        => Ok(await service.GetFaresAsync(routeId, ct));

    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<FareDto>> Create(FareRequest request, CancellationToken ct)
    {
        var result = await service.CreateFareAsync(request, ct);
        return result.Ok ? Created($"api/fares/{result.Value!.Id}", result.Value) : this.ToProblem(result);
    }

    [HttpPut("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<FareDto>> Update(long id, FareRequest request, CancellationToken ct)
    {
        var result = await service.UpdateFareAsync(id, request, ct);
        return result.Ok ? Ok(result.Value) : this.ToProblem(result);
    }

    [HttpDelete("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var result = await service.DeleteFareAsync(id, ct);
        return result.Ok ? NoContent() : this.ToProblem(result);
    }
}

/// <summary>US3 - Danh mục đối tượng hành khách, dùng khi thiết lập giá vé.</summary>
[ApiController]
[Route("api/passenger-types")]
public sealed class PassengerTypesController(IRouteManagementService service) : ControllerBase
{
    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<PassengerTypeDto>>> Get(CancellationToken ct)
        => Ok(await service.GetPassengerTypesAsync(ct));
}
