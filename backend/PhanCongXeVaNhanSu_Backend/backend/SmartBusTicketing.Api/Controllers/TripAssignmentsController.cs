using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// US13-US14: Phân công xe và nhân sự (Gán xe buýt, tài xế và phụ xe cho từng chuyến chạy).
/// Quản lý / Admin có toàn quyền phân công; Tài xế / Phụ xe chỉ được xem ca trực của chính mình.
/// </summary>
[ApiController]
[Route("api/assignments")]
public sealed class TripAssignmentsController(ITripAssignmentService service, AuditLogService audit) : ControllerBase
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
    /// Lấy danh sách chuyến chạy kèm thông tin phân công xe, tài xế và phụ xe.
    /// Quyền: Admin, Manager xem toàn bộ. Tài xế / Phụ xe chỉ được xem chuyến mà chính họ được phân công.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager,Driver,Conductor")]
    public async Task<ActionResult<PagedResponse<TripAssignmentDto>>> GetAssignments(
        [FromQuery] long? routeId,
        [FromQuery] DateOnly? date,
        [FromQuery] DateTime? fromUtc,
        [FromQuery] DateTime? toUtc,
        [FromQuery] TripStatus? status,
        [FromQuery] AssignmentStateFilter? state,
        [FromQuery] long? busId,
        [FromQuery] long? driverId,
        [FromQuery] long? conductorId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var callerId = User.AccountId();
        var isManagerOrAdmin = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);

        var filter = new TripAssignmentFilter
        {
            RouteId = routeId,
            Date = date,
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Status = status,
            State = state,
            BusId = busId,
            DriverId = driverId,
            ConductorId = conductorId,
            // Bảo mật thông tin cá nhân: Nếu là tài xế / phụ xe thì BẮT BUỘC chỉ lọc theo ca của chính mình
            StaffAccountId = isManagerOrAdmin ? null : callerId,
            Search = search
        };

        var response = await service.GetAssignmentsAsync(filter, page, pageSize, ct);
        return Ok(response);
    }

    /// <summary>
    /// Xem chi tiết thông tin phân công của một chuyến chạy.
    /// Admin/Manager xem bất kỳ chuyến nào. Tài xế/Phụ xe chỉ xem được chuyến của chính mình.
    /// </summary>
    [HttpGet("{tripId:long}")]
    [Authorize(Roles = "Admin,Manager,Driver,Conductor")]
    public async Task<ActionResult<TripAssignmentDto>> GetById(long tripId, CancellationToken ct)
    {
        var dto = await service.GetAssignmentByIdAsync(tripId, ct);
        if (dto is null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = $"Không tìm thấy chuyến chạy #{tripId}." });
        }

        var isManagerOrAdmin = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isManagerOrAdmin)
        {
            var callerId = User.AccountId();
            // Nếu tài xế/phụ xe không được phân công vào chuyến này thì chặn truy cập
            if (dto.Driver?.AccountId != callerId && dto.Conductor?.AccountId != callerId)
            {
                return Forbid();
            }
        }

        return Ok(dto);
    }

    /// <summary>
    /// Gán hoặc thay đổi xe buýt, tài xế và phụ xe cho chuyến chạy.
    /// Kiểm tra ràng buộc hợp lệ: xe hoạt động, tài xế/phụ xe đúng role và không bị trùng giờ chạy.
    /// Sử dụng Database Transaction (Serializable) ngăn ngừa double-booking.
    /// </summary>
    [HttpPut("{tripId:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> AssignTrip(long tripId, [FromBody] AssignTripRequest request, CancellationToken ct)
    {
        var result = await service.AssignTripAsync(tripId, request, ct);
        if (!result.Ok) return ToProblem(this, result);

        var details = $"Xe: {(result.Value!.Bus != null ? result.Value.Bus.PlateNumber : "Chưa gán")}, " +
                      $"Lái xe: {(result.Value.Driver != null ? result.Value.Driver.FullName : "Chưa gán")}, " +
                      $"Phụ xe: {(result.Value.Conductor != null ? result.Value.Conductor.FullName : "Không có")}";

        await LogAuditAsync($"Phân công xe và nhân sự cho chuyến #{tripId} (Tuyến {result.Value.RouteCode})",
            AuditActionType.Update, $"ASSIGNMENT-{tripId}", details, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Gỡ phân công xe, tài xế hoặc phụ xe khỏi chuyến chạy.
    /// </summary>
    [HttpDelete("{tripId:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> UnassignTrip(long tripId, [FromBody] UnassignTripRequest? request, CancellationToken ct)
    {
        var req = request ?? new UnassignTripRequest();
        var result = await service.UnassignTripAsync(tripId, req, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Gỡ phân công xe/nhân sự của chuyến #{tripId}",
            AuditActionType.Delete, $"ASSIGNMENT-{tripId}", null, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Phân công hàng loạt một tổ xe buýt / tài xế / phụ xe cho nhiều chuyến chạy.
    /// </summary>
    [HttpPost("batch")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<BatchAssignResultDto>> BatchAssign([FromBody] BatchAssignTripRequest request, CancellationToken ct)
    {
        var result = await service.BatchAssignAsync(request, ct);
        if (!result.Ok) return ToProblem(this, result);

        await LogAuditAsync($"Phân công hàng loạt cho {request.TripIds.Count} chuyến chạy (Thành công: {result.Value!.SuccessCount})",
            AuditActionType.Update, "ASSIGNMENT-BATCH", null, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Kiểm tra trước xem việc gán xe, tài xế, phụ xe có bị xung đột thời gian với chuyến nào khác không.
    /// </summary>
    [HttpPost("check-conflict")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<ConflictCheckResponse>> CheckConflict([FromBody] ConflictCheckRequest request, CancellationToken ct)
    {
        var response = await service.CheckConflictAsync(request, ct);
        return Ok(response);
    }

    /// <summary>
    /// Lấy danh sách xe buýt và kiểm tra tính khả dụng tại thời điểm xuất bến dự kiến.
    /// </summary>
    [HttpGet("available-buses")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<AvailableBusDto>>> GetAvailableBuses(
        [FromQuery] DateTime departureAt,
        [FromQuery] long routeId,
        [FromQuery] long? excludeTripId,
        CancellationToken ct)
    {
        var buses = await service.GetAvailableBusesAsync(departureAt, routeId, excludeTripId, ct);
        return Ok(buses);
    }

    /// <summary>
    /// Lấy danh sách nhân sự (Tài xế hoặc Phụ xe) và kiểm tra tính khả dụng tại thời điểm xuất bến dự kiến.
    /// </summary>
    [HttpGet("available-staff")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<AvailableStaffDto>>> GetAvailableStaff(
        [FromQuery] StaffDuty duty,
        [FromQuery] DateTime departureAt,
        [FromQuery] long routeId,
        [FromQuery] long? excludeTripId,
        CancellationToken ct)
    {
        var staff = await service.GetAvailableStaffAsync(duty, departureAt, routeId, excludeTripId, ct);
        return Ok(staff);
    }

    /// <summary>
    /// Dành cho Tài xế hoặc Phụ xe đang đăng nhập: Tra cứu ca trực và lộ trình các chuyến được phân công.
    /// </summary>
    [HttpGet("my-schedule")]
    [Authorize(Roles = "Driver,Conductor,Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<DriverScheduleDto>>> GetMySchedule([FromQuery] DateOnly? date, CancellationToken ct)
    {
        var accountId = User.AccountId();
        if (!accountId.HasValue)
        {
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Không xác định được danh tính người dùng." });
        }

        var schedule = await service.GetMyScheduleAsync(accountId.Value, date, ct);
        return Ok(schedule);
    }
}
