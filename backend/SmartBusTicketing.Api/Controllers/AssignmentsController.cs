using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Quản lý phân công điều xe & tài xế / phụ xe (SCRUM-50, SCRUM-51).
/// Hoạt động trực tiếp trên thực thể Chuyến chạy (Trips) và Nhân sự chuyến (TripStaff).
/// Kiểm tra trùng lịch và ghi nhật ký kiểm toán.
/// </summary>
[ApiController]
[Route("api/assignments")]
[Authorize]
public class AssignmentsController(AppDbContext db, AuditLogService audit, ILogger<AssignmentsController> logger) : ControllerBase
{
    private static (long? Id, string Raw) ParseCodeOrId(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return (null, string.Empty);
        var v = value.Trim();
        if (long.TryParse(v, out var num)) return (num, v);
        if (v.StartsWith("ASN-", StringComparison.OrdinalIgnoreCase) && long.TryParse(v[4..], out var asnNum)) return (asnNum, v);
        if (v.StartsWith("TRIP-", StringComparison.OrdinalIgnoreCase) && long.TryParse(v[5..], out var tripNum)) return (tripNum, v);
        return (null, v);
    }

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
        var q = db.Trips.AsNoTracking()
            .Include(t => t.BusRoute).ThenInclude(r => r.RouteStops)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(routeId) && routeId != "ALL")
        {
            if (long.TryParse(routeId, out var rId))
            {
                q = q.Where(t => t.RouteId == rId);
            }
            else
            {
                q = q.Where(t => t.BusRoute.Code == routeId);
            }
        }

        if (!string.IsNullOrWhiteSpace(date))
        {
            if (DateOnly.TryParse(date, out var parsedDate))
            {
                var startOfDay = parsedDate.ToDateTime(TimeOnly.MinValue);
                var endOfDay = parsedDate.ToDateTime(TimeOnly.MaxValue);
                q = q.Where(t => t.DepartureAt >= startOfDay && t.DepartureAt <= endOfDay);
            }
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            var stUpper = status.Trim().ToUpperInvariant();
            TripStatus? targetStatus = stUpper switch
            {
                "ASSIGNED" => TripStatus.Scheduled,
                "IN_PROGRESS" or "RUNNING" => TripStatus.Running,
                "COMPLETED" => TripStatus.Completed,
                "CANCELLED" => TripStatus.Cancelled,
                _ => Enum.TryParse<TripStatus>(status, true, out var parsedStatus) ? parsedStatus : null
            };

            if (targetStatus.HasValue)
            {
                q = q.Where(t => t.Status == targetStatus.Value);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            q = q.Where(t =>
                t.BusRoute.Code.Contains(value)
                || t.BusRoute.Name.Contains(value)
                || (t.Bus != null && t.Bus.PlateNumber.Contains(value))
                || t.TripStaff.Any(ts => ts.Account.FullName.Contains(value) || ts.Account.Username.Contains(value)));
        }

        var trips = await q.OrderByDescending(t => t.DepartureAt)
            .ThenByDescending(t => t.Id)
            .ToListAsync(ct);

        var list = trips.Select(ToDto).ToList();

        if (!string.IsNullOrWhiteSpace(shift) && shift != "ALL")
        {
            list = list.Where(a => string.Equals(a.Shift, shift, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return Ok(list);
    }

    /// <summary>
    /// Xem chi tiết một bản ghi phân công theo mã chuyến hoặc mã ASN.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        var (numId, _) = ParseCodeOrId(id);
        if (!numId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy thông tin phân công chuyến xe." });
        }

        var trip = await db.Trips.AsNoTracking()
            .Include(t => t.BusRoute).ThenInclude(r => r.RouteStops)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .FirstOrDefaultAsync(t => t.Id == numId.Value, ct);

        return trip is null
            ? NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy thông tin phân công chuyến xe." })
            : Ok(ToDto(trip));
    }

    /// <summary>
    /// Kiểm tra trùng lịch trước khi gửi form (cho UI hiển thị cảnh báo tức thì).
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
            logger,
            ct);

        return Ok(result);
    }

    /// <summary>
    /// Tạo mới chuyến xe và phân công điều xe/tài xế. Kiểm tra trùng lịch và ghi nhật ký kiểm toán.
    /// </summary>
    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create(CreateAssignmentRequest request, CancellationToken ct)
    {
        // 1. Xác thực Tuyến xe (RouteId) - TUYỆT ĐỐI không âm thầm gán RouteId = 1
        BusRoute? route = null;
        if (long.TryParse(request.RouteId, out var parsedRouteId))
        {
            route = await db.BusRoutes.FirstOrDefaultAsync(r => r.Id == parsedRouteId, ct);
        }
        if (route == null && !string.IsNullOrWhiteSpace(request.RouteId))
        {
            route = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == request.RouteId.Trim(), ct);
        }
        if (route == null)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Tuyến xe không tồn tại",
                Detail = $"Không tìm thấy tuyến xe với thông tin: '{request.RouteId}'. Vui lòng chọn tuyến đường hợp lệ."
            });
        }

        // 2. Xác thực Phương tiện (Bus)
        var cleanPlate = request.BusPlate.Trim().ToUpperInvariant();
        var bus = await db.Buses.FirstOrDefaultAsync(b => b.PlateNumber == cleanPlate, ct);
        if (bus == null)
        {
            bus = new Bus
            {
                PlateNumber = cleanPlate,
                Capacity = 40,
                Status = BusStatus.Active
            };
            db.Buses.Add(bus);
            await db.SaveChangesAsync(ct);
        }

        // 3. Xác thực Tài xế (Driver) - Ưu tiên tra cứu theo Id / Username, sau đó mới đến FullName
        Account? driver = null;
        if (long.TryParse(request.DriverId, out var drvNumId))
        {
            driver = await db.Accounts.FirstOrDefaultAsync(a => a.Id == drvNumId, ct);
        }
        if (driver == null && !string.IsNullOrWhiteSpace(request.DriverId))
        {
            var rawDrv = request.DriverId.Trim();
            if (rawDrv.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(rawDrv[4..], out var uId))
            {
                driver = await db.Accounts.FirstOrDefaultAsync(a => a.Id == uId, ct);
            }
            if (driver == null)
            {
                driver = await db.Accounts.FirstOrDefaultAsync(a => a.Username == rawDrv, ct);
            }
        }
        if (driver == null && !string.IsNullOrWhiteSpace(request.DriverName))
        {
            driver = await db.Accounts.FirstOrDefaultAsync(a => a.FullName == request.DriverName.Trim() && a.Role == AccountRole.Driver, ct);
        }
        if (driver == null)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Tài xế không tồn tại",
                Detail = $"Không tìm thấy thông tin tài xế '{request.DriverName ?? request.DriverId}' trong hệ thống."
            });
        }

        // 4. Xác thực Phụ xe (Assistant) nếu có
        Account? assistant = null;
        if (!string.IsNullOrWhiteSpace(request.AssistantId) || !string.IsNullOrWhiteSpace(request.AssistantName))
        {
            if (long.TryParse(request.AssistantId, out var asstNumId))
            {
                assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Id == asstNumId, ct);
            }
            if (assistant == null && !string.IsNullOrWhiteSpace(request.AssistantId))
            {
                var rawAsst = request.AssistantId.Trim();
                if (rawAsst.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(rawAsst[4..], out var uId))
                {
                    assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Id == uId, ct);
                }
                if (assistant == null)
                {
                    assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Username == rawAsst, ct);
                }
            }
            if (assistant == null && !string.IsNullOrWhiteSpace(request.AssistantName))
            {
                assistant = await db.Accounts.FirstOrDefaultAsync(a => a.FullName == request.AssistantName.Trim(), ct);
            }
        }

        // 5. Tính toán khung giờ ca chạy
        var (startTime, endTime) = AssignmentConflictHelper.ParseTimeRange(request.Date, request.ShiftHours, request.Shift);

        // 6. Kiểm tra trùng lịch xe & nhân sự (SCRUM-51)
        var conflict = await AssignmentConflictHelper.CheckTripConflictAsync(
            db,
            bus.Id,
            bus.PlateNumber,
            driver.Id,
            assistant?.Id,
            startTime,
            endTime,
            excludeTripId: null,
            logger,
            ct);

        if (conflict.HasConflict)
        {
            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Phân công điều xe thất bại do trùng lịch",
                AuditActionType.Create,
                $"BUS-{bus.PlateNumber}",
                AuditStatus.Failure,
                conflict.Message,
                ct);

            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = conflict.Message,
                Detail = conflict.Message
            });
        }

        // 7. Tạo thực thể Trip và TripStaff tương ứng
        var trip = new Trip
        {
            RouteId = route.Id,
            BusId = bus.Id,
            DepartureAt = startTime,
            Status = TripStatus.Scheduled,
        };

        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);

        db.TripStaff.Add(new TripStaff
        {
            TripId = trip.Id,
            AccountId = driver.Id,
            Duty = StaffDuty.Driver
        });

        if (assistant != null)
        {
            db.TripStaff.Add(new TripStaff
            {
                TripId = trip.Id,
                AccountId = assistant.Id,
                Duty = StaffDuty.Conductor
            });
        }

        await db.SaveChangesAsync(ct);

        // Nạp các quan hệ để trả về đầy đủ DTO
        await db.Entry(trip).Reference(t => t.BusRoute).Query().Include(r => r.RouteStops).LoadAsync(ct);
        await db.Entry(trip).Reference(t => t.Bus).LoadAsync(ct);
        await db.Entry(trip).Collection(t => t.TripStaff).Query().Include(ts => ts.Account).LoadAsync(ct);

        // 8. Ghi nhật ký kiểm toán thành công
        await audit.WriteAsync(
            User.AccountId(),
            User.Username() ?? "system",
            "Tạo phân công điều xe",
            AuditActionType.Create,
            $"TRIP-{trip.Id}",
            AuditStatus.Success,
            $"Phân công tài xế {driver.FullName} điều khiển xe {bus.PlateNumber} chuyến #{trip.Id} lúc {trip.DepartureAt:yyyy-MM-dd HH:mm}",
            ct);

        var dto = ToDto(trip);
        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, dto);
    }

    /// <summary>
    /// Cập nhật thông tin phân công điều xe. Kiểm tra trùng lịch và ghi nhật ký kiểm toán.
    /// </summary>
    [HttpPut("{id}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(string id, UpdateAssignmentRequest request, CancellationToken ct)
    {
        var (numId, _) = ParseCodeOrId(id);
        if (!numId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để cập nhật." });
        }

        var trip = await db.Trips
            .Include(t => t.BusRoute).ThenInclude(r => r.RouteStops)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .FirstOrDefaultAsync(t => t.Id == numId.Value, ct);

        if (trip == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để cập nhật." });
        }

        // 1. Xác thực tuyến xe nếu thay đổi
        if (!string.IsNullOrWhiteSpace(request.RouteId))
        {
            BusRoute? matchedRoute = null;
            if (long.TryParse(request.RouteId, out var parsedRouteId))
            {
                matchedRoute = await db.BusRoutes.FirstOrDefaultAsync(r => r.Id == parsedRouteId, ct);
            }
            if (matchedRoute == null)
            {
                matchedRoute = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == request.RouteId.Trim(), ct);
            }

            if (matchedRoute == null)
            {
                return BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Tuyến xe không tồn tại",
                    Detail = $"Không tìm thấy tuyến xe '{request.RouteId}'."
                });
            }
            trip.RouteId = matchedRoute.Id;
        }

        // 2. Xác thực phương tiện xe buýt
        var cleanPlate = request.BusPlate.Trim().ToUpperInvariant();
        var bus = await db.Buses.FirstOrDefaultAsync(b => b.PlateNumber == cleanPlate, ct);
        if (bus == null)
        {
            bus = new Bus { PlateNumber = cleanPlate, Capacity = 40, Status = BusStatus.Active };
            db.Buses.Add(bus);
            await db.SaveChangesAsync(ct);
        }
        trip.BusId = bus.Id;

        // 3. Xác thực tài xế
        Account? driver = null;
        if (long.TryParse(request.DriverId, out var drvNumId))
        {
            driver = await db.Accounts.FirstOrDefaultAsync(a => a.Id == drvNumId, ct);
        }
        if (driver == null && !string.IsNullOrWhiteSpace(request.DriverId))
        {
            var rawDrv = request.DriverId.Trim();
            if (rawDrv.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(rawDrv[4..], out var uId))
            {
                driver = await db.Accounts.FirstOrDefaultAsync(a => a.Id == uId, ct);
            }
            if (driver == null)
            {
                driver = await db.Accounts.FirstOrDefaultAsync(a => a.Username == rawDrv, ct);
            }
        }
        if (driver == null && !string.IsNullOrWhiteSpace(request.DriverName))
        {
            driver = await db.Accounts.FirstOrDefaultAsync(a => a.FullName == request.DriverName.Trim() && a.Role == AccountRole.Driver, ct);
        }
        if (driver == null)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Tài xế không tồn tại",
                Detail = $"Không tìm thấy thông tin tài xế '{request.DriverName ?? request.DriverId}' trong hệ thống."
            });
        }

        // 4. Xác thực phụ xe
        Account? assistant = null;
        if (!string.IsNullOrWhiteSpace(request.AssistantId) || !string.IsNullOrWhiteSpace(request.AssistantName))
        {
            if (long.TryParse(request.AssistantId, out var asstNumId))
            {
                assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Id == asstNumId, ct);
            }
            if (assistant == null && !string.IsNullOrWhiteSpace(request.AssistantId))
            {
                var rawAsst = request.AssistantId.Trim();
                if (rawAsst.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(rawAsst[4..], out var uId))
                {
                    assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Id == uId, ct);
                }
                if (assistant == null)
                {
                    assistant = await db.Accounts.FirstOrDefaultAsync(a => a.Username == rawAsst, ct);
                }
            }
            if (assistant == null && !string.IsNullOrWhiteSpace(request.AssistantName))
            {
                assistant = await db.Accounts.FirstOrDefaultAsync(a => a.FullName == request.AssistantName.Trim(), ct);
            }
        }

        // 5. Tính toán khung giờ và kiểm tra trùng lịch (loại trừ chính chuyến đang cập nhật)
        var (startTime, endTime) = AssignmentConflictHelper.ParseTimeRange(request.Date, request.ShiftHours, request.Shift);

        var conflict = await AssignmentConflictHelper.CheckTripConflictAsync(
            db,
            bus.Id,
            bus.PlateNumber,
            driver.Id,
            assistant?.Id,
            startTime,
            endTime,
            excludeTripId: trip.Id,
            logger,
            ct);

        if (conflict.HasConflict)
        {
            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Cập nhật phân công thất bại do trùng lịch",
                AuditActionType.Update,
                $"TRIP-{trip.Id}",
                AuditStatus.Failure,
                conflict.Message,
                ct);

            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = conflict.Message,
                Detail = conflict.Message
            });
        }

        // 6. Cập nhật Trip
        trip.DepartureAt = startTime;
        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var stUpper = request.Status.Trim().ToUpperInvariant();
            if (stUpper == "ASSIGNED") trip.Status = TripStatus.Scheduled;
            else if (stUpper == "IN_PROGRESS" || stUpper == "RUNNING") trip.Status = TripStatus.Running;
            else if (stUpper == "COMPLETED") trip.Status = TripStatus.Completed;
            else if (stUpper == "CANCELLED") trip.Status = TripStatus.Cancelled;
        }

        // 7. Cập nhật TripStaff
        var existingStaff = await db.TripStaff.Where(ts => ts.TripId == trip.Id).ToListAsync(ct);
        db.TripStaff.RemoveRange(existingStaff);

        db.TripStaff.Add(new TripStaff
        {
            TripId = trip.Id,
            AccountId = driver.Id,
            Duty = StaffDuty.Driver
        });

        if (assistant != null)
        {
            db.TripStaff.Add(new TripStaff
            {
                TripId = trip.Id,
                AccountId = assistant.Id,
                Duty = StaffDuty.Conductor
            });
        }

        await db.SaveChangesAsync(ct);

        // Nạp lại dữ liệu
        await db.Entry(trip).Reference(t => t.BusRoute).Query().Include(r => r.RouteStops).LoadAsync(ct);
        await db.Entry(trip).Reference(t => t.Bus).LoadAsync(ct);
        await db.Entry(trip).Collection(t => t.TripStaff).Query().Include(ts => ts.Account).LoadAsync(ct);

        await audit.WriteAsync(
            User.AccountId(),
            User.Username() ?? "system",
            "Cập nhật phân công điều xe",
            AuditActionType.Update,
            $"TRIP-{trip.Id}",
            AuditStatus.Success,
            $"Cập nhật chuyến #{trip.Id}: Xe {bus.PlateNumber}, Tài xế {driver.FullName}, Trạng thái: {trip.Status}",
            ct);

        return Ok(ToDto(trip));
    }

    /// <summary>
    /// Xóa / Hủy phân công chuyến xe. Ghi nhật ký kiểm toán.
    /// </summary>
    [HttpDelete("{id}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var (numId, _) = ParseCodeOrId(id);
        if (!numId.HasValue)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để xóa." });
        }

        var trip = await db.Trips
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .FirstOrDefaultAsync(t => t.Id == numId.Value, ct);

        if (trip == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy phân công để xóa." });
        }

        // Kiểm tra xem chuyến xe đã có vé đặt chưa
        var hasBookings = await db.Bookings.AnyAsync(b => b.TripId == trip.Id, ct);
        if (hasBookings)
        {
            // Nếu đã có vé đặt, không xóa vật lý mà chuyển trạng thái sang CANCELLED
            trip.Status = TripStatus.Cancelled;
            await db.SaveChangesAsync(ct);

            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Hủy chuyến xe phân công",
                AuditActionType.StatusChange,
                $"TRIP-{trip.Id}",
                AuditStatus.Success,
                $"Chuyển trạng thái chuyến #{trip.Id} sang Đã hủy (do đã có vé đặt)",
                ct);
        }
        else
        {
            var staffList = await db.TripStaff.Where(ts => ts.TripId == trip.Id).ToListAsync(ct);
            db.TripStaff.RemoveRange(staffList);
            db.Trips.Remove(trip);
            await db.SaveChangesAsync(ct);

            await audit.WriteAsync(
                User.AccountId(),
                User.Username() ?? "system",
                "Xóa phân công điều xe",
                AuditActionType.Delete,
                $"TRIP-{trip.Id}",
                AuditStatus.Success,
                $"Xóa chuyến xe phân công #{trip.Id} của xe {trip.Bus?.PlateNumber} lúc {trip.DepartureAt:yyyy-MM-dd}",
                ct);
        }

        return NoContent();
    }

    private static AssignmentDto ToDto(Trip t)
    {
        var driver = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver)?.Account;
        var assistant = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor)?.Account;
        var durationMinutes = 60;
        if (t.BusRoute?.RouteStops != null && t.BusRoute.RouteStops.Count > 0)
        {
            var maxMin = t.BusRoute.RouteStops.Max(rs => rs.MinutesFromStart);
            if (maxMin > 0) durationMinutes = maxMin;
        }

        var start = t.DepartureAt;
        var end = start.AddMinutes(durationMinutes);
        var shift = start.Hour < 13 ? "CA_SANG" : (start.Hour < 18 ? "CA_CHIEU" : "CA_TOI");
        var shiftHours = $"{start:HH:mm} — {end:HH:mm}";
        var statusStr = t.Status switch
        {
            TripStatus.Scheduled => "ASSIGNED",
            TripStatus.Running => "IN_PROGRESS",
            TripStatus.Completed => "COMPLETED",
            TripStatus.Cancelled => "CANCELLED",
            _ => t.Status.ToString().ToUpperInvariant()
        };

        return new AssignmentDto
        {
            Id = $"ASN-{t.Id:D4}",
            RawId = t.Id,
            RouteId = t.BusRoute?.Code ?? t.RouteId.ToString(),
            RouteCode = t.BusRoute?.Code,
            RouteName = t.BusRoute?.Name,
            BusPlate = t.Bus?.PlateNumber ?? string.Empty,
            DriverId = driver?.Id.ToString() ?? string.Empty,
            DriverName = driver?.FullName ?? string.Empty,
            AssistantId = assistant?.Id.ToString(),
            AssistantName = assistant?.FullName,
            Date = start.ToString("yyyy-MM-dd"),
            Shift = shift,
            ShiftHours = shiftHours,
            StartTime = start,
            EndTime = end,
            Status = statusStr,
            Notes = null,
            CreatedAt = start,
            UpdatedAt = start,
        };
    }
}
