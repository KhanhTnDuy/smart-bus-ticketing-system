using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Quản lý phân công điều xe & tài xế / phụ xe.
/// Kiểm tra trùng lịch điều xe/tài xế và ghi nhật ký thao tác kiểm toán.
/// </summary>
[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    /// <summary>
    /// Danh sách phân công xe & tài xế theo bộ lọc tìm kiếm.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? routeId,
        [FromQuery] string? shift,
        [FromQuery] string? status,
        [FromQuery] string? date,
        CancellationToken ct)
    {
        var q = db.BusAssignments.AsNoTracking().Include(a => a.Route).AsQueryable();

        if (!string.IsNullOrWhiteSpace(shift) && shift != "ALL")
        {
            q = q.Where(a => a.Shift == shift);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            q = q.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(date))
        {
            if (DateOnly.TryParse(date, out var parsedDate))
            {
                q = q.Where(a => a.Date == parsedDate);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            q = q.Where(a => a.AssignmentCode.Contains(value)
                || a.BusPlate.Contains(value)
                || a.DriverName.Contains(value)
                || (a.AssistantName != null && a.AssistantName.Contains(value))
                || (a.Notes != null && a.Notes.Contains(value))
                || (a.Route != null && (a.Route.Code.Contains(value) || a.Route.Name.Contains(value))));
        }

        var list = await q.OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.StartTime)
            .ThenByDescending(a => a.Id)
            .Select(a => ToDto(a))
            .ToListAsync(ct);

        return Ok(list);
    }

    /// <summary>
    /// Xem chi tiết một bản ghi phân công.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        BusAssignment? entity = null;
        if (long.TryParse(id, out var numId))
        {
            entity = await db.BusAssignments.AsNoTracking()
                .Include(a => a.Route)
                .FirstOrDefaultAsync(a => a.Id == numId, ct);
        }

        if (entity == null)
        {
            entity = await db.BusAssignments.AsNoTracking()
                .Include(a => a.Route)
                .FirstOrDefaultAsync(a => a.AssignmentCode == id, ct);
        }

        return entity is null ? NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy thông tin phân công." }) : Ok(ToDto(entity));
    }

    /// <summary>
    /// Kiểm tra trùng lịch trước khi gửi form (dành cho UI hiển thị cảnh báo tức thì).
    /// </summary>
    [HttpPost("check-conflict")]
    public async Task<IActionResult> CheckConflict(CheckConflictRequest request, CancellationToken ct)
    {
        var (start, end) = AssignmentConflictHelper.ParseTimeRange(request.Date, request.ShiftHours, request.Shift);
        var result = await AssignmentConflictHelper.CheckConflictAsync(
            db,
            request.BusPlate,
            request.DriverId,
            request.DriverName,
            request.AssistantId,
            request.AssistantName,
            start,
            end,
            request.ExcludeId,
            ct);

        return Ok(result);
    }

    /// <summary>
    /// Tạo mới phân công điều xe. Kiểm tra trùng lịch và ghi nhật ký kiểm toán.
    /// </summary>
    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(CreateAssignmentRequest request, CancellationToken ct)
    {
        var (startTime, endTime) = AssignmentConflictHelper.ParseTimeRange(request.Date, request.ShiftHours, request.Shift);

        // 1. Kiểm tra trùng lịch (Overlap check)
        var conflict = await AssignmentConflictHelper.CheckConflictAsync(
            db,
            request.BusPlate,
            request.DriverId,
            request.DriverName,
            request.AssistantId,
            request.AssistantName,
            startTime,
            endTime,
            excludeId: null,
            ct);

        if (conflict.HasConflict)
        {
            // Ghi nhật ký thất bại vì trùng lịch
            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Phân công điều xe thất bại do trùng lịch",
                AuditActionType.Create,
                $"BUS-{request.BusPlate.Trim().ToUpperInvariant()}",
                AuditStatus.Failure,
                conflict.Message,
                ct);

            return Conflict(new ProblemDetails
            {
                Status = 409,
                Title = conflict.Message,
                Detail = conflict.Message
            });
        }

        // 2. Tra cứu RouteId tương ứng
        long resolvedRouteId = 1;
        if (long.TryParse(request.RouteId, out var parsedRouteId))
        {
            resolvedRouteId = parsedRouteId;
        }
        else
        {
            var matchedRoute = await db.BusRoutes.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Code == request.RouteId, ct);
            if (matchedRoute != null)
            {
                resolvedRouteId = matchedRoute.Id;
            }
        }

        // 3. Đánh mã phân công tự động (ASN-xxx)
        var maxId = await db.BusAssignments.Select(a => (long?)a.Id).MaxAsync(ct) ?? 0;
        var newCode = $"ASN-{String.Format("{0:D3}", maxId + 1)}";

        DateOnly.TryParse(request.Date, out var dateOnly);
        if (dateOnly == default) dateOnly = DateOnly.FromDateTime(startTime);

        var entity = new BusAssignment
        {
            AssignmentCode = newCode,
            RouteId = resolvedRouteId,
            BusPlate = request.BusPlate.Trim().ToUpperInvariant(),
            DriverId = request.DriverId.Trim(),
            DriverName = request.DriverName.Trim(),
            AssistantId = string.IsNullOrWhiteSpace(request.AssistantId) ? null : request.AssistantId.Trim(),
            AssistantName = string.IsNullOrWhiteSpace(request.AssistantName) ? null : request.AssistantName.Trim(),
            Date = dateOnly,
            Shift = request.Shift,
            ShiftHours = request.ShiftHours,
            StartTime = startTime,
            EndTime = endTime,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "ASSIGNED" : request.Status.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        db.BusAssignments.Add(entity);
        await db.SaveChangesAsync(ct);

        // Nạp thêm Route navigation nếu có
        await db.Entry(entity).Reference(a => a.Route).LoadAsync(ct);

        // 4. Ghi nhật ký thao tác kiểm toán
        await audit.WriteAsync(
            User.AccountId(),
            User.Username() ?? "system",
            "Tạo phân công điều xe",
            AuditActionType.Create,
            $"ASSIGN-{entity.Id}",
            AuditStatus.Success,
            $"Phân công tài xế {entity.DriverName} điều khiển xe {entity.BusPlate} ({entity.Date:yyyy-MM-dd}, {entity.ShiftHours})",
            ct);

        var dto = ToDto(entity);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
    }

    /// <summary>
    /// Cập nhật thông tin phân công điều xe. Kiểm tra trùng lịch và ghi nhật ký kiểm toán.
    /// </summary>
    [HttpPut("{id}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(string id, UpdateAssignmentRequest request, CancellationToken ct)
    {
        BusAssignment? entity = null;
        if (long.TryParse(id, out var numId))
        {
            entity = await db.BusAssignments.Include(a => a.Route).FirstOrDefaultAsync(a => a.Id == numId, ct);
        }

        if (entity == null)
        {
            entity = await db.BusAssignments.Include(a => a.Route).FirstOrDefaultAsync(a => a.AssignmentCode == id, ct);
        }

        if (entity == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để cập nhật." });
        }

        var (startTime, endTime) = AssignmentConflictHelper.ParseTimeRange(request.Date, request.ShiftHours, request.Shift);

        // Kiểm tra trùng lịch (loại trừ chính entity đang cập nhật)
        var conflict = await AssignmentConflictHelper.CheckConflictAsync(
            db,
            request.BusPlate,
            request.DriverId,
            request.DriverName,
            request.AssistantId,
            request.AssistantName,
            startTime,
            endTime,
            excludeId: entity.Id,
            ct);

        if (conflict.HasConflict)
        {
            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Cập nhật phân công thất bại do trùng lịch",
                AuditActionType.Update,
                $"ASSIGN-{entity.Id}",
                AuditStatus.Failure,
                conflict.Message,
                ct);

            return Conflict(new ProblemDetails
            {
                Status = 409,
                Title = conflict.Message,
                Detail = conflict.Message
            });
        }

        long resolvedRouteId = entity.RouteId;
        if (long.TryParse(request.RouteId, out var parsedRouteId))
        {
            resolvedRouteId = parsedRouteId;
        }
        else if (!string.IsNullOrWhiteSpace(request.RouteId))
        {
            var matchedRoute = await db.BusRoutes.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Code == request.RouteId, ct);
            if (matchedRoute != null)
            {
                resolvedRouteId = matchedRoute.Id;
            }
        }

        DateOnly.TryParse(request.Date, out var dateOnly);
        if (dateOnly == default) dateOnly = entity.Date;

        var oldStatus = entity.Status;

        entity.RouteId = resolvedRouteId;
        entity.BusPlate = request.BusPlate.Trim().ToUpperInvariant();
        entity.DriverId = request.DriverId.Trim();
        entity.DriverName = request.DriverName.Trim();
        entity.AssistantId = string.IsNullOrWhiteSpace(request.AssistantId) ? null : request.AssistantId.Trim();
        entity.AssistantName = string.IsNullOrWhiteSpace(request.AssistantName) ? null : request.AssistantName.Trim();
        entity.Date = dateOnly;
        entity.Shift = request.Shift;
        entity.ShiftHours = request.ShiftHours;
        entity.StartTime = startTime;
        entity.EndTime = endTime;
        entity.Status = request.Status;
        entity.Notes = request.Notes?.Trim();
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        // Ghi nhật ký thao tác
        var actionType = oldStatus != entity.Status ? AuditActionType.StatusChange : AuditActionType.Update;
        await audit.WriteAsync(
            User.AccountId(),
            User.Username() ?? "system",
            "Cập nhật phân công điều xe",
            actionType,
            $"ASSIGN-{entity.Id}",
            AuditStatus.Success,
            $"Cập nhật phân công [{entity.AssignmentCode}]: Xe {entity.BusPlate}, Tài xế {entity.DriverName}, Trạng thái: {entity.Status}",
            ct);

        return Ok(ToDto(entity));
    }

    /// <summary>
    /// Xóa phân công ca trực. Ghi nhật ký thao tác kiểm toán.
    /// </summary>
    [HttpDelete("{id}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        BusAssignment? entity = null;
        if (long.TryParse(id, out var numId))
        {
            entity = await db.BusAssignments.FirstOrDefaultAsync(a => a.Id == numId, ct);
        }

        if (entity == null)
        {
            entity = await db.BusAssignments.FirstOrDefaultAsync(a => a.AssignmentCode == id, ct);
        }

        if (entity == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để xóa." });
        }

        db.BusAssignments.Remove(entity);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(
            User.AccountId(),
            User.Username() ?? "system",
            "Xóa phân công điều xe",
            AuditActionType.Delete,
            $"ASSIGN-{entity.Id}",
            AuditStatus.Success,
            $"Xóa lệnh phân công [{entity.AssignmentCode}] của xe {entity.BusPlate} ngày {entity.Date:yyyy-MM-dd}",
            ct);

        return NoContent();
    }

    private static AssignmentDto ToDto(BusAssignment a) => new()
    {
        Id = string.IsNullOrWhiteSpace(a.AssignmentCode) ? $"ASN-{a.Id}" : a.AssignmentCode,
        RawId = a.Id,
        RouteId = a.Route?.Code ?? a.RouteId.ToString(),
        RouteCode = a.Route?.Code,
        RouteName = a.Route?.Name,
        BusPlate = a.BusPlate,
        DriverId = a.DriverId,
        DriverName = a.DriverName,
        AssistantId = a.AssistantId,
        AssistantName = a.AssistantName,
        Date = a.Date.ToString("yyyy-MM-dd"),
        Shift = a.Shift,
        ShiftHours = a.ShiftHours,
        StartTime = a.StartTime,
        EndTime = a.EndTime,
        Status = a.Status,
        Notes = a.Notes,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt,
    };
}
