using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// US13-US14 (SCRUM-50): Phân công xe và nhân sự (Gán xe buýt, tài xế và phụ xe cho từng chuyến chạy).
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

    private static (long? TripId, string CleanId) ParseId(string id)
    {
        if (string.IsNullOrWhiteSpace(id)) return (null, string.Empty);
        var clean = id.Trim();
        if (clean.StartsWith("ASN-", StringComparison.OrdinalIgnoreCase)) clean = clean[4..];
        else if (clean.StartsWith("TRIP-", StringComparison.OrdinalIgnoreCase)) clean = clean[5..];

        if (long.TryParse(clean, out var num)) return (num, clean);
        return (null, id);
    }

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
        [FromQuery] string? shift,
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

        // Lọc ca nếu có yêu cầu (ví dụ: CA_SANG, CA_CHIEU, CA_TOI)
        if (!string.IsNullOrWhiteSpace(shift) && shift != "ALL")
        {
            var filtered = response.Data.Where(a => string.Equals(a.Shift, shift, StringComparison.OrdinalIgnoreCase)).ToList();
            response = new PagedResponse<TripAssignmentDto>
            {
                Data = filtered,
                Page = response.Page,
                PageSize = response.PageSize,
                Total = filtered.Count
            };
        }

        return Ok(response);
    }

    /// <summary>
    /// Xem chi tiết thông tin phân công của một chuyến chạy.
    /// Admin/Manager xem bất kỳ chuyến nào. Tài xế/Phụ xe chỉ xem được chuyến của chính mình.
    /// Hỗ trợ cả định dạng số (1) và tiền tố (ASN-1, TRIP-1).
    /// </summary>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin,Manager,Driver,Conductor")]
    public async Task<ActionResult<TripAssignmentDto>> GetById(string id, CancellationToken ct)
    {
        var (tripId, _) = ParseId(id);
        if (!tripId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = $"Mã phân công / chuyến xe không hợp lệ: '{id}'." });
        }

        var dto = await service.GetAssignmentByIdAsync(tripId.Value, ct);
        if (dto is null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = $"Không tìm thấy chuyến chạy #{tripId.Value}." });
        }

        var isManagerOrAdmin = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isManagerOrAdmin)
        {
            var callerId = User.AccountId();
            // Nếu tài xế/phụ xe không được phân công vào chuyến này thì chặn truy cập (chống lộ thông tin cá nhân)
            if (dto.Driver?.AccountId != callerId && dto.Conductor?.AccountId != callerId)
            {
                return Forbid();
            }
        }

        return Ok(dto);
    }

    /// <summary>
    /// Tạo mới một chuyến chạy và phân công phương tiện, tài xế, phụ xe.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> CreateAssignment([FromBody] CreateTripRequest request, CancellationToken ct)
    {
        var result = await service.CreateTripWithAssignmentAsync(request, ct);
        if (!result.Ok)
        {
            await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
                "Tạo phân công chuyến chạy thất bại", AuditActionType.Create,
                request.RouteId.HasValue ? $"ASSIGNMENT-ROUTE-{request.RouteId}" : "ASSIGNMENT",
                AuditStatus.Failure, result.Message, ct);
            return ToProblem(this, result);
        }

        var details = $"Tuyến: {result.Value!.RouteCode}, Xe: {result.Value.BusPlate}, " +
                      $"Lái xe: {result.Value.DriverName}, Phụ xe: {result.Value.AssistantName ?? "Không có"}";

        await LogAuditAsync($"Tạo phân công chuyến chạy #{result.Value.TripId} ({details})",
            AuditActionType.Create, $"ASSIGNMENT-{result.Value.TripId}", details, ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Value.TripId }, result.Value);
    }

    /// <summary>
    /// Gán hoặc thay đổi xe buýt, tài xế và phụ xe cho chuyến chạy.
    /// Kiểm tra ràng buộc hợp lệ: xe hoạt động, tài xế/phụ xe đúng role và không bị trùng giờ chạy.
    /// Sử dụng Database Transaction (Serializable) ngăn ngừa race-condition và double-booking.
    /// Hỗ trợ cả định dạng số (1) và tiền tố (ASN-1, TRIP-1).
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> AssignTrip(string id, [FromBody] AssignTripRequest request, CancellationToken ct)
    {
        var (tripId, _) = ParseId(id);
        if (!tripId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = $"Mã phân công / chuyến xe không hợp lệ: '{id}'." });
        }

        var result = await service.AssignTripAsync(tripId.Value, request, ct);
        if (!result.Ok)
        {
            await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
                $"Phân công xe và nhân sự cho chuyến #{tripId.Value} thất bại", AuditActionType.Update,
                $"ASSIGNMENT-{tripId.Value}", AuditStatus.Failure, result.Message, ct);
            return ToProblem(this, result);
        }

        var details = $"Xe: {(result.Value!.Bus != null ? result.Value.Bus.PlateNumber : "Chưa gán")}, " +
                      $"Lái xe: {(result.Value.Driver != null ? result.Value.Driver.FullName : "Chưa gán")}, " +
                      $"Phụ xe: {(result.Value.Conductor != null ? result.Value.Conductor.FullName : "Không có")}";

        await LogAuditAsync($"Phân công xe và nhân sự cho chuyến #{tripId.Value} (Tuyến {result.Value.RouteCode})",
            AuditActionType.Update, $"ASSIGNMENT-{tripId.Value}", details, ct);

        return Ok(result.Value);
    }

    /// <summary>
    /// Gỡ phân công xe, tài xế hoặc phụ xe khỏi chuyến chạy.
    /// Hỗ trợ cả định dạng số (1) và tiền tố (ASN-1, TRIP-1).
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<TripAssignmentDto>> UnassignTrip(string id, [FromBody] UnassignTripRequest? request, CancellationToken ct)
    {
        var (tripId, _) = ParseId(id);
        if (!tripId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = $"Mã phân công / chuyến xe không hợp lệ: '{id}'." });
        }

        var req = request ?? new UnassignTripRequest();
        var result = await service.UnassignTripAsync(tripId.Value, req, ct);
        if (!result.Ok)
        {
            await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
                $"Gỡ phân công chuyến #{tripId.Value} thất bại", AuditActionType.Delete,
                $"ASSIGNMENT-{tripId.Value}", AuditStatus.Failure, result.Message, ct);
            return ToProblem(this, result);
        }

        await LogAuditAsync($"Gỡ phân công xe/nhân sự của chuyến #{tripId.Value}",
            AuditActionType.Delete, $"ASSIGNMENT-{tripId.Value}", null, ct);

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
        if (!result.Ok)
        {
            await audit.WriteAsync(User.AccountId(), User.Username() ?? "system",
                "Phân công hàng loạt thất bại", AuditActionType.Update,
                "ASSIGNMENT-BATCH", AuditStatus.Failure, result.Message, ct);
            return ToProblem(this, result);
        }

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
