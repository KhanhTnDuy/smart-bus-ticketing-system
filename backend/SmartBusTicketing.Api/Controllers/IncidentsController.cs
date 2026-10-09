using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Báo cáo và xử lý sự cố trên chuyến xe.
///
/// Tài xế, phụ xe chỉ báo sự cố cho chuyến mình được phân công và chỉ xem báo cáo của chính mình.
/// Admin, Quản lý xem tất cả và đóng sự cố. Sự cố có thời gian trễ làm chuyến chuyển sang trạng thái
/// Trễ giờ và tạo thông báo cho hành khách đã đặt vé trên chuyến đó.
/// </summary>
[ApiController]
[Route("api/incidents")]
[Authorize(Roles = "Admin,Manager,Driver,Conductor,Passenger")]
public class IncidentsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private bool IsManagement => User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);

    private IQueryable<IncidentDto> Project(IQueryable<Incident> q) => q.Select(i => new IncidentDto
    {
        Id = i.Id,
        TripId = i.TripId,
        RouteCode = i.Trip.BusRoute.Code,
        RouteName = i.Trip.BusRoute.Name,
        DepartureAt = i.Trip.DepartureAt,
        BusPlate = i.Trip.Bus != null ? i.Trip.Bus.PlateNumber : null,
        IncidentType = i.IncidentType,
        DelayMinutes = i.DelayMinutes,
        Status = i.Status,
        Location = i.Location,
        Description = i.Description,
        ReportedBy = i.ReportedBy,
        ReporterName = i.Reporter.FullName,
        ReporterPhone = i.Reporter.Phone,
        CreatedAt = i.CreatedAt,
        ResolvedAt = i.ResolvedAt,
        ResolvedByName = i.Resolver != null ? i.Resolver.FullName : null,
        ResolutionNote = i.ResolutionNote,
    });

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IncidentDto>>> GetAll(
        [FromQuery] IncidentStatus? status,
        [FromQuery] IncidentType? type,
        [FromQuery] long? tripId,
        CancellationToken ct)
    {
        var q = db.Incidents.AsNoTracking().AsQueryable();
        if (!IsManagement)
        {
            var me = User.AccountId();
            q = q.Where(i => i.ReportedBy == me);
        }
        if (status.HasValue) q = q.Where(i => i.Status == status.Value);
        if (type.HasValue) q = q.Where(i => i.IncidentType == type.Value);
        if (tripId.HasValue) q = q.Where(i => i.TripId == tripId.Value);

        return Ok(await Project(q.OrderByDescending(i => i.CreatedAt).ThenByDescending(i => i.Id)).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<IncidentDto>> Get(long id, CancellationToken ct)
    {
        var dto = await Project(db.Incidents.AsNoTracking().Where(i => i.Id == id)).FirstOrDefaultAsync(ct);
        if (dto is null) return NotFound();
        if (!IsManagement && dto.ReportedBy != User.AccountId()) return Forbid();
        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<IncidentDto>> Create(CreateIncidentRequest request, CancellationToken ct)
    {
        var actorId = User.AccountId();
        if (actorId is null) return Unauthorized();
        if (!Enum.IsDefined(request.IncidentType))
            return BadRequest(new { message = "Loại sự cố không hợp lệ." });

        var trip = await db.Trips.Include(t => t.TripStaff).FirstOrDefaultAsync(t => t.Id == request.TripId, ct);
        if (trip is null) return NotFound(new { message = $"Không tìm thấy chuyến #{request.TripId}." });
        if (trip.Status is TripStatus.Completed or TripStatus.Cancelled)
            return Conflict(new { message = $"Chuyến #{trip.Id} đã kết thúc hoặc bị hủy, không thể báo sự cố." });

        // Hành khách báo sự cố phải đang có vé đặt trên chuyến. Báo cáo của hành khách chỉ được ghi nhận
        // để quản lý xác minh: không đổi giờ chuyến và không gửi thông báo cho người khác.
        var isPassenger = User.IsInAppRole(AccountRole.Passenger);
        if (isPassenger)
        {
            var hasBooking = await db.Bookings.AnyAsync(b => b.TripId == trip.Id && b.PassengerId == actorId &&
                (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed), ct);
            if (!hasBooking)
                return StatusCode(403, new { message = "Bạn chưa có vé đặt trên chuyến này nên không thể báo sự cố." });
        }
        // Chỉ người được phân công cho chuyến mới báo sự cố của chuyến đó (Admin, Quản lý báo thay được).
        else if (!IsManagement && trip.TripStaff.All(s => s.AccountId != actorId))
            return StatusCode(403, new { message = "Bạn không được phân công cho chuyến này nên không thể báo sự cố." });

        var delayMinutes = isPassenger ? 0 : request.DelayMinutes;
        var now = DateTime.UtcNow;
        var incident = new Incident
        {
            TripId = trip.Id,
            ReportedBy = actorId.Value,
            IncidentType = request.IncidentType,
            DelayMinutes = delayMinutes,
            Location = request.Location.Trim(),
            Description = request.Description.Trim(),
            Status = IncidentStatus.Open,
            CreatedAt = now,
        };
        db.Incidents.Add(incident);

        if (delayMinutes > 0)
        {
            trip.DelayMinutes = Math.Max(trip.DelayMinutes, delayMinutes);
            if (trip.Status is TripStatus.Scheduled or TripStatus.Running) trip.Status = TripStatus.Delayed;
        }

        // Báo cho hành khách đang giữ vé trên chuyến này (chỉ khi người báo là nhân viên hoặc quản lý).
        var passengerIds = isPassenger
            ? new List<long>()
            : await db.Bookings
                .Where(b => b.TripId == trip.Id && (b.Status == BookingStatus.Pending || b.Status == BookingStatus.Confirmed))
            .Select(b => b.PassengerId).Distinct().ToListAsync(ct);
        var message = delayMinutes > 0
            ? $"Chuyến #{trip.Id} gặp sự cố tại {incident.Location}, dự kiến trễ khoảng {delayMinutes} phút."
            : $"Chuyến #{trip.Id} gặp sự cố tại {incident.Location}. Nhà xe đang xử lý.";
        foreach (var passengerId in passengerIds)
        {
            incident.Notifications.Add(new Notification
            {
                AccountId = passengerId,
                TripId = trip.Id,
                Type = delayMinutes > 0 ? NotificationType.Delay : NotificationType.Incident,
                Message = message,
                CreatedAt = now,
            });
        }

        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(actorId, User.Username() ?? "system", $"Báo sự cố chuyến #{trip.Id}",
            AuditActionType.Create, $"INCIDENT-{incident.Id}", AuditStatus.Success,
            $"{request.IncidentType}, trễ {delayMinutes} phút, tại {incident.Location}. Đã báo {passengerIds.Count} hành khách.", ct);

        var dto = await Project(db.Incidents.AsNoTracking().Where(i => i.Id == incident.Id)).FirstAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = incident.Id }, dto);
    }

    /// <summary>Đóng sự cố kèm ghi chú xử lý. Chỉ Admin, Quản lý.</summary>
    [HttpPatch("{id:long}/resolve")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IncidentDto>> Resolve(long id, ResolveIncidentRequest request, CancellationToken ct)
    {
        var incident = await db.Incidents.FirstOrDefaultAsync(i => i.Id == id, ct);
        if (incident is null) return NotFound();
        if (incident.Status == IncidentStatus.Resolved)
            return Conflict(new { message = "Sự cố này đã được xử lý xong." });

        incident.Status = IncidentStatus.Resolved;
        incident.ResolvedAt = DateTime.UtcNow;
        incident.ResolvedBy = User.AccountId();
        incident.ResolutionNote = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim();
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(User.AccountId(), User.Username() ?? "system", $"Đóng sự cố #{id}",
            AuditActionType.StatusChange, $"INCIDENT-{id}", AuditStatus.Success, incident.ResolutionNote, ct);

        return Ok(await Project(db.Incidents.AsNoTracking().Where(i => i.Id == id)).FirstAsync(ct));
    }
}
