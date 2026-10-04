using System.Data;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public interface ITripAssignmentService
{
    // Phân công xe và nhân sự (dành cho Quản lý / Điều hành)
    Task<PagedResponse<TripAssignmentDto>> GetAssignmentsAsync(TripAssignmentFilter filter, int page, int pageSize, CancellationToken ct);
    Task<TripAssignmentDto?> GetAssignmentByIdAsync(long tripId, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> AssignTripAsync(long tripId, AssignTripRequest request, CancellationToken ct);
    Task<ServiceResult<BatchAssignResultDto>> BatchAssignAsync(BatchAssignTripRequest request, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> UnassignTripAsync(long tripId, UnassignTripRequest request, CancellationToken ct);

    // Thao tác tạo chuyến & phân công
    Task<ServiceResult<TripAssignmentDto>> CreateTripWithAssignmentAsync(CreateTripRequest request, CancellationToken ct);

    // Tra cứu khả dụng & kiểm tra xung đột
    Task<IReadOnlyList<AvailableBusDto>> GetAvailableBusesAsync(DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<IReadOnlyList<AvailableStaffDto>> GetAvailableStaffAsync(StaffDuty duty, DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<ConflictCheckResponse> CheckConflictAsync(ConflictCheckRequest request, CancellationToken ct);

    // Tra cứu ca trực cá nhân của Tài xế / Phụ xe
    Task<IReadOnlyList<DriverScheduleDto>> GetMyScheduleAsync(long accountId, DateOnly? date, CancellationToken ct);
}

public sealed class TripAssignmentService(AppDbContext db) : ITripAssignmentService
{
    /// <summary>Việt Nam không dùng giờ mùa hè nên dùng độ lệch cố định, không phụ thuộc tzdata máy chủ.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    private static (int Page, int PageSize) Normalize(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    private static string FormatTripStatus(TripStatus status) => status switch
    {
        TripStatus.Scheduled => "Đã lên lịch",
        TripStatus.Running => "Đang chạy",
        TripStatus.Delayed => "Trễ giờ",
        TripStatus.Completed => "Hoàn thành",
        TripStatus.Cancelled => "Đã hủy",
        _ => status.ToString()
    };

    private static string FormatBusStatus(BusStatus status) => status switch
    {
        BusStatus.Active => "Hoạt động",
        BusStatus.Maintenance => "Bảo trì",
        BusStatus.Inactive => "Ngừng hoạt động",
        _ => status.ToString()
    };

    /// <summary>
    /// Tính thời gian hành trình dự kiến của tuyến dựa trên danh sách trạm dừng.
    /// Nếu chưa cấu hình trạm dừng, mặc định là 60 phút.
    /// </summary>
    private async Task<int> GetRouteDurationMinutesAsync(long routeId, CancellationToken ct)
    {
        var maxMinutes = await db.RouteStops
            .Where(rs => rs.RouteId == routeId)
            .Select(rs => (int?)rs.MinutesFromStart)
            .MaxAsync(ct);

        return (maxMinutes.HasValue && maxMinutes.Value > 0) ? maxMinutes.Value : 60;
    }

    /// <summary>
    /// Lấy từ điển thời lượng của nhiều tuyến để tính toán nhanh trong bộ nhớ.
    /// </summary>
    private async Task<Dictionary<long, int>> GetRouteDurationsAsync(IEnumerable<long> routeIds, CancellationToken ct)
    {
        var ids = routeIds.Distinct().ToList();
        if (ids.Count == 0) return new();

        var list = await db.RouteStops
            .Where(rs => ids.Contains(rs.RouteId))
            .GroupBy(rs => rs.RouteId)
            .Select(g => new { RouteId = g.Key, MaxMinutes = g.Max(rs => rs.MinutesFromStart) })
            .ToListAsync(ct);

        return list.ToDictionary(x => x.RouteId, x => x.MaxMinutes > 0 ? x.MaxMinutes : 60);
    }

    /// <summary>
    /// Tìm chuyến chạy bị trùng lấn thời gian với xe buýt.
    /// Hai chuyến giao nhau khi và chỉ khi: otherStart < thisEnd && thisStart < otherEnd.
    /// Mỗi chuyến sử dụng thời lượng thực tế của tuyến đó + 15 phút đệm nghỉ/quay đầu xe.
    /// </summary>
    private async Task<Trip?> FindConflictingTripForBusAsync(
        long busId,
        DateTime departureAt,
        int thisDurationMinutes,
        long? excludeTripId,
        CancellationToken ct)
    {
        var thisStart = departureAt;
        var thisEnd = thisStart.AddMinutes(thisDurationMinutes + 15);

        // Lấy các chuyến của xe buýt này trong vòng 24 giờ xung quanh
        var candidates = await db.Trips
            .Include(t => t.BusRoute)
            .Where(t => t.BusId == busId &&
                (!excludeTripId.HasValue || t.Id != excludeTripId.Value) &&
                (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running) &&
                t.DepartureAt >= thisStart.AddHours(-24) &&
                t.DepartureAt <= thisEnd.AddHours(24))
            .ToListAsync(ct);

        if (candidates.Count == 0) return null;

        var routeIds = candidates.Select(c => c.RouteId).Distinct().ToList();
        var routeDurations = await GetRouteDurationsAsync(routeIds, ct);

        foreach (var other in candidates)
        {
            var otherDuration = routeDurations.GetValueOrDefault(other.RouteId, 60);
            var otherStart = other.DepartureAt;
            var otherEnd = otherStart.AddMinutes(otherDuration + 15);

            if (otherStart < thisEnd && thisStart < otherEnd)
            {
                return other;
            }
        }

        return null;
    }

    /// <summary>
    /// Tìm chuyến chạy bị trùng lấn thời gian với nhân viên (Tài xế hoặc Phụ xe).
    /// Hai chuyến giao nhau khi và chỉ khi: otherStart < thisEnd && thisStart < otherEnd.
    /// </summary>
    private async Task<Trip?> FindConflictingTripForStaffAsync(
        long accountId,
        DateTime departureAt,
        int thisDurationMinutes,
        long? excludeTripId,
        CancellationToken ct)
    {
        var thisStart = departureAt;
        var thisEnd = thisStart.AddMinutes(thisDurationMinutes + 15);

        var candidates = await db.TripStaff
            .Include(ts => ts.Trip).ThenInclude(t => t.BusRoute)
            .Where(ts => ts.AccountId == accountId &&
                (!excludeTripId.HasValue || ts.TripId != excludeTripId.Value) &&
                (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running) &&
                ts.Trip.DepartureAt >= thisStart.AddHours(-24) &&
                ts.Trip.DepartureAt <= thisEnd.AddHours(24))
            .Select(ts => ts.Trip)
            .ToListAsync(ct);

        if (candidates.Count == 0) return null;

        var routeIds = candidates.Select(c => c.RouteId).Distinct().ToList();
        var routeDurations = await GetRouteDurationsAsync(routeIds, ct);

        foreach (var other in candidates)
        {
            var otherDuration = routeDurations.GetValueOrDefault(other.RouteId, 60);
            var otherStart = other.DepartureAt;
            var otherEnd = otherStart.AddMinutes(otherDuration + 15);

            if (otherStart < thisEnd && thisStart < otherEnd)
            {
                return other;
            }
        }

        return null;
    }

    // ==========================================
    // 1. Phân công xe và nhân sự (Trip Assignment)
    // ==========================================

    public async Task<PagedResponse<TripAssignmentDto>> GetAssignmentsAsync(
        TripAssignmentFilter filter,
        int page,
        int pageSize,
        CancellationToken ct)
    {
        var (normPage, normPageSize) = Normalize(page, pageSize);

        var query = db.Trips
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .Include(t => t.Bookings)
            .AsNoTracking();

        // 1. Lọc theo nhân sự (Dùng cho quyền Tài xế / Phụ xe chỉ xem ca của mình)
        if (filter.StaffAccountId.HasValue)
        {
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.StaffAccountId.Value));
        }

        // 2. Lọc theo tuyến đường
        if (filter.RouteId.HasValue)
        {
            query = query.Where(t => t.RouteId == filter.RouteId.Value);
        }

        // 3. Lọc theo ngày khởi hành
        if (filter.Date.HasValue)
        {
            var date = filter.Date.Value;
            // Ngày lọc là ngày Việt Nam (UTC+7), còn trips.DepartureAt lưu UTC nên phải đổi mốc đầu/cuối ngày sang UTC.
            var startUtc = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MaxValue) - VietnamOffset, DateTimeKind.Utc);
            query = query.Where(t => t.DepartureAt >= startUtc && t.DepartureAt <= endUtc);
        }

        if (filter.FromUtc.HasValue)
        {
            query = query.Where(t => t.DepartureAt >= filter.FromUtc.Value);
        }

        if (filter.ToUtc.HasValue)
        {
            query = query.Where(t => t.DepartureAt <= filter.ToUtc.Value);
        }

        // 4. Lọc theo trạng thái chuyến chạy
        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        // 5. Lọc theo xe buýt cụ thể
        if (filter.BusId.HasValue)
        {
            query = query.Where(t => t.BusId == filter.BusId.Value);
        }

        // 6. Lọc theo tài xế cụ thể
        if (filter.DriverId.HasValue)
        {
            query = query.Where(t => t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver && ts.AccountId == filter.DriverId.Value));
        }

        // 7. Lọc theo phụ xe cụ thể
        if (filter.ConductorId.HasValue)
        {
            query = query.Where(t => t.TripStaff.Any(ts => ts.Duty == StaffDuty.Conductor && ts.AccountId == filter.ConductorId.Value));
        }

        // 8. Lọc theo tình trạng phân công (FullyAssigned, PartiallyAssigned, Unassigned)
        if (filter.State.HasValue && filter.State.Value != AssignmentStateFilter.All)
        {
            query = filter.State.Value switch
            {
                AssignmentStateFilter.FullyAssigned => query.Where(t => t.BusId != null && t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver)),
                AssignmentStateFilter.PartiallyAssigned => query.Where(t => (t.BusId != null && !t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver)) ||
                                                                            (t.BusId == null && t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver))),
                AssignmentStateFilter.Unassigned => query.Where(t => t.BusId == null && !t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver)),
                _ => query
            };
        }

        // 9. Tìm kiếm tự do theo mã tuyến, tên tuyến, biển số xe, tên tài xế/phụ xe
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(t =>
                t.BusRoute.Code.ToLower().Contains(term) ||
                t.BusRoute.Name.ToLower().Contains(term) ||
                (t.Bus != null && t.Bus.PlateNumber.ToLower().Contains(term)) ||
                t.TripStaff.Any(ts => ts.Account.FullName.ToLower().Contains(term) || ts.Account.Username.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);

        var trips = await query
            .OrderByDescending(t => t.DepartureAt)
            .ThenByDescending(t => t.Id)
            .Skip((normPage - 1) * normPageSize)
            .Take(normPageSize)
            .ToListAsync(ct);

        var routeIds = trips.Select(t => t.RouteId).Distinct().ToList();
        var routeDurations = await GetRouteDurationsAsync(routeIds, ct);

        var items = trips.Select(t =>
        {
            var duration = routeDurations.GetValueOrDefault(t.RouteId, 60);
            var driver = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver);
            var conductor = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor);

            return new TripAssignmentDto
            {
                TripId = t.Id,
                RouteId = t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                RouteStartPoint = t.BusRoute.StartPoint,
                RouteEndPoint = t.BusRoute.EndPoint,
                ScheduleId = t.ScheduleId,
                DepartureAt = t.DepartureAt,
                EstimatedDurationMinutes = duration,
                EstimatedArrivalAt = t.DepartureAt.AddMinutes(duration + t.DelayMinutes),
                Status = t.Status,
                StatusText = FormatTripStatus(t.Status),
                DelayMinutes = t.DelayMinutes,
                Bus = t.Bus != null ? new BusAssignmentInfo
                {
                    Id = t.Bus.Id,
                    PlateNumber = t.Bus.PlateNumber,
                    Capacity = t.Bus.Capacity,
                    Status = t.Bus.Status
                } : null,
                Driver = driver != null ? new StaffAssignmentInfo
                {
                    AccountId = driver.AccountId,
                    Username = driver.Account.Username,
                    FullName = driver.Account.FullName,
                    Phone = driver.Account.Phone,
                    Duty = StaffDuty.Driver
                } : null,
                Conductor = conductor != null ? new StaffAssignmentInfo
                {
                    AccountId = conductor.AccountId,
                    Username = conductor.Account.Username,
                    FullName = conductor.Account.FullName,
                    Phone = conductor.Account.Phone,
                    Duty = StaffDuty.Conductor
                } : null,
                BookedTicketsCount = t.Bookings.Count(b => b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Pending)
            };
        }).ToList();

        return new PagedResponse<TripAssignmentDto>
        {
            Data = items,
            Page = normPage,
            PageSize = normPageSize,
            Total = total
        };
    }

    public async Task<TripAssignmentDto?> GetAssignmentByIdAsync(long tripId, CancellationToken ct)
    {
        var t = await db.Trips
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .Include(t => t.Bookings)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tripId, ct);

        if (t == null) return null;

        var duration = await GetRouteDurationMinutesAsync(t.RouteId, ct);
        var driver = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver);
        var conductor = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor);

        return new TripAssignmentDto
        {
            TripId = t.Id,
            RouteId = t.RouteId,
            RouteCode = t.BusRoute.Code,
            RouteName = t.BusRoute.Name,
            RouteStartPoint = t.BusRoute.StartPoint,
            RouteEndPoint = t.BusRoute.EndPoint,
            ScheduleId = t.ScheduleId,
            DepartureAt = t.DepartureAt,
            EstimatedDurationMinutes = duration,
            EstimatedArrivalAt = t.DepartureAt.AddMinutes(duration + t.DelayMinutes),
            Status = t.Status,
            StatusText = FormatTripStatus(t.Status),
            DelayMinutes = t.DelayMinutes,
            Bus = t.Bus != null ? new BusAssignmentInfo
            {
                Id = t.Bus.Id,
                PlateNumber = t.Bus.PlateNumber,
                Capacity = t.Bus.Capacity,
                Status = t.Bus.Status
            } : null,
            Driver = driver != null ? new StaffAssignmentInfo
            {
                AccountId = driver.AccountId,
                Username = driver.Account.Username,
                FullName = driver.Account.FullName,
                Phone = driver.Account.Phone,
                Duty = StaffDuty.Driver
            } : null,
            Conductor = conductor != null ? new StaffAssignmentInfo
            {
                AccountId = conductor.AccountId,
                Username = conductor.Account.Username,
                FullName = conductor.Account.FullName,
                Phone = conductor.Account.Phone,
                Duty = StaffDuty.Conductor
            } : null,
            BookedTicketsCount = t.Bookings.Count(b => b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Pending)
        };
    }

    /// <summary>
    /// Gán xe buýt, tài xế và phụ xe cho chuyến chạy.
    /// Sử dụng Database Transaction (Serializable) để ngăn chặn double-booking khi có nhiều quản trị viên cùng thao tác.
    /// </summary>
    public async Task<ServiceResult<TripAssignmentDto>> AssignTripAsync(long tripId, AssignTripRequest request, CancellationToken ct)
    {
        var ownsTx = db.Database.CurrentTransaction == null;
        var tx = ownsTx ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        try
        {
            var trip = await db.Trips
                .Include(t => t.BusRoute)
                .Include(t => t.Bus)
                .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
                .Include(t => t.Bookings)
                .FirstOrDefaultAsync(t => t.Id == tripId, ct);

            if (trip == null)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy chuyến chạy có ID {tripId}.");
            }

            if (trip.Status == TripStatus.Completed || trip.Status == TripStatus.Cancelled)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                    $"Chuyến chạy #{tripId} đang ở trạng thái '{FormatTripStatus(trip.Status)}', không thể phân công xe hoặc nhân sự.");
            }

            var duration = await GetRouteDurationMinutesAsync(trip.RouteId, ct);

            // Tự động phân giải BusId nếu truyền dạng BusPlate
            long? targetBusId = request.BusId;
            if (!targetBusId.HasValue && !string.IsNullOrWhiteSpace(request.BusPlate))
            {
                var cleanPlate = request.BusPlate.Trim().ToUpperInvariant();
                var foundBus = await db.Buses.FirstOrDefaultAsync(b => b.PlateNumber == cleanPlate, ct);
                if (foundBus != null) targetBusId = foundBus.Id;
            }

            // Tự động phân giải DriverId nếu truyền dạng DriverName
            long? targetDriverId = request.DriverId;
            if (!targetDriverId.HasValue && !string.IsNullOrWhiteSpace(request.DriverName))
            {
                var cleanName = request.DriverName.Trim();
                var foundDriver = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Driver &&
                    (a.FullName == cleanName || a.Username == cleanName), ct);
                if (foundDriver != null) targetDriverId = foundDriver.Id;
            }

            // Tự động phân giải ConductorId nếu truyền dạng AssistantId hoặc AssistantName
            long? targetConductorId = request.ConductorId;
            if (!targetConductorId.HasValue)
            {
                if (!string.IsNullOrWhiteSpace(request.AssistantId) && long.TryParse(request.AssistantId, out var parsedAsstId))
                {
                    targetConductorId = parsedAsstId;
                }
                else if (!string.IsNullOrWhiteSpace(request.AssistantName))
                {
                    var cleanAsst = request.AssistantName.Trim();
                    var foundConductor = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Conductor &&
                        (a.FullName == cleanAsst || a.Username == cleanAsst), ct);
                    if (foundConductor != null) targetConductorId = foundConductor.Id;
                }
            }

            // 1. Kiểm tra xe buýt
            if (targetBusId.HasValue)
            {
                var bus = await db.Buses.FindAsync([targetBusId.Value], ct);
                if (bus == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy xe buýt với ID {targetBusId.Value}.");
                }
                if (bus.Status != BusStatus.Active)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Xe buýt '{bus.PlateNumber}' đang ở trạng thái '{FormatBusStatus(bus.Status)}', không thể phân công vào chuyến chạy.");
                }

                // Kiểm tra trùng lịch xe buýt (otherStart < thisEnd && thisStart < otherEnd)
                var busConflict = await FindConflictingTripForBusAsync(targetBusId.Value, trip.DepartureAt, duration, tripId, ct);
                if (busConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Xe buýt '{bus.PlateNumber}' đã được gán cho chuyến #{busConflict.Id} (Tuyến {busConflict.BusRoute.Code}) lúc {busConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }

                trip.BusId = targetBusId.Value;
            }
            else
            {
                trip.BusId = null;
            }

            // 2. Kiểm tra tài xế & phụ xe không được là cùng một người
            if (targetDriverId.HasValue && targetConductorId.HasValue && targetDriverId.Value == targetConductorId.Value)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                    "Tài xế và phụ xe không được là cùng một người.");
            }

            // 3. Kiểm tra tài xế
            if (targetDriverId.HasValue)
            {
                var driver = await db.Accounts.FindAsync([targetDriverId.Value], ct);
                if (driver == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy tài xế với ID {targetDriverId.Value}.");
                }
                if (!driver.Active)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict, $"Tài khoản của tài xế '{driver.FullName}' đang bị khóa.");
                }
                if (driver.Role != AccountRole.Driver)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                        $"Người dùng '{driver.FullName}' có vai trò '{driver.Role}', không phải là Tài xế (Driver).");
                }

                // Kiểm tra trùng lịch tài xế
                var driverConflict = await FindConflictingTripForStaffAsync(targetDriverId.Value, trip.DepartureAt, duration, tripId, ct);
                if (driverConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Tài xế '{driver.FullName}' đã được phân công cho chuyến #{driverConflict.Id} (Tuyến {driverConflict.BusRoute.Code}) lúc {driverConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }

            // 4. Kiểm tra phụ xe
            if (targetConductorId.HasValue)
            {
                var conductor = await db.Accounts.FindAsync([targetConductorId.Value], ct);
                if (conductor == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy phụ xe với ID {targetConductorId.Value}.");
                }
                if (!conductor.Active)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict, $"Tài khoản của phụ xe '{conductor.FullName}' đang bị khóa.");
                }
                if (conductor.Role != AccountRole.Conductor)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                        $"Người dùng '{conductor.FullName}' có vai trò '{conductor.Role}', không phải là Phụ xe (Conductor).");
                }

                // Kiểm tra trùng lịch phụ xe
                var conductorConflict = await FindConflictingTripForStaffAsync(targetConductorId.Value, trip.DepartureAt, duration, tripId, ct);
                if (conductorConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Phụ xe '{conductor.FullName}' đã được phân công cho chuyến #{conductorConflict.Id} (Tuyến {conductorConflict.BusRoute.Code}) lúc {conductorConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }

            // 5. Cập nhật bảng nhân sự chuyến (TripStaff)
            var currentStaff = trip.TripStaff.ToList();
            db.TripStaff.RemoveRange(currentStaff);

            if (targetDriverId.HasValue)
            {
                db.TripStaff.Add(new TripStaff
                {
                    TripId = tripId,
                    AccountId = targetDriverId.Value,
                    Duty = StaffDuty.Driver
                });
            }

            if (targetConductorId.HasValue)
            {
                db.TripStaff.Add(new TripStaff
                {
                    TripId = tripId,
                    AccountId = targetConductorId.Value,
                    Duty = StaffDuty.Conductor
                });
            }

            await db.SaveChangesAsync(ct);
            if (tx != null) await tx.CommitAsync(ct);

            var dto = await GetAssignmentByIdAsync(tripId, ct);
            return ServiceResult<TripAssignmentDto>.Success(dto!);
        }
        catch
        {
            if (tx != null) await tx.RollbackAsync(ct);
            throw;
        }
        finally
        {
            if (tx != null) await tx.DisposeAsync();
        }
    }

    public async Task<ServiceResult<BatchAssignResultDto>> BatchAssignAsync(BatchAssignTripRequest request, CancellationToken ct)
    {
        var result = new BatchAssignResultDto
        {
            TotalRequested = request.TripIds.Count
        };

        var singleAssignReq = new AssignTripRequest
        {
            BusId = request.BusId,
            DriverId = request.DriverId,
            ConductorId = request.ConductorId,
            Notes = request.Notes
        };

        foreach (var tripId in request.TripIds)
        {
            var res = await AssignTripAsync(tripId, singleAssignReq, ct);
            if (res.Ok)
            {
                result.SuccessCount++;
                result.SuccessTripIds.Add($"TRIP-{tripId}");
            }
            else
            {
                result.FailedCount++;
                result.Failures.Add(new BatchAssignFailureDto
                {
                    TripId = tripId,
                    Reason = res.Message ?? "Lỗi phân công"
                });
            }
        }

        return ServiceResult<BatchAssignResultDto>.Success(result);
    }

    public async Task<ServiceResult<TripAssignmentDto>> UnassignTripAsync(long tripId, UnassignTripRequest request, CancellationToken ct)
    {
        var trip = await db.Trips
            .Include(t => t.TripStaff)
            .FirstOrDefaultAsync(t => t.Id == tripId, ct);

        if (trip == null)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy chuyến chạy có ID {tripId}.");
        }

        if (trip.Status == TripStatus.Completed || trip.Status == TripStatus.Cancelled)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                $"Chuyến chạy #{tripId} đang ở trạng thái '{FormatTripStatus(trip.Status)}', không thể gỡ phân công.");
        }

        if (request.UnassignBus)
        {
            trip.BusId = null;
        }

        if (request.UnassignDriver)
        {
            var driver = trip.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver);
            if (driver != null) db.TripStaff.Remove(driver);
        }

        if (request.UnassignConductor)
        {
            var conductor = trip.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor);
            if (conductor != null) db.TripStaff.Remove(conductor);
        }

        await db.SaveChangesAsync(ct);

        var dto = await GetAssignmentByIdAsync(tripId, ct);
        return ServiceResult<TripAssignmentDto>.Success(dto!);
    }

    // ==========================================
    // 2. Thao tác tạo chuyến & phân công
    // ==========================================

    public async Task<ServiceResult<TripAssignmentDto>> CreateTripWithAssignmentAsync(CreateTripRequest request, CancellationToken ct)
    {
        // 1. Phân giải RouteId
        BusRoute? route = null;
        if (request.RouteId.HasValue && request.RouteId.Value > 0)
        {
            route = await db.BusRoutes.FindAsync([request.RouteId.Value], ct);
        }
        else if (!string.IsNullOrWhiteSpace(request.RouteCode))
        {
            var cleanCode = request.RouteCode.Trim();
            route = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == cleanCode || r.Name.Contains(cleanCode), ct);
        }

        if (route == null)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến xe buýt hợp lệ.");
        }

        if (!route.Active)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict, $"Tuyến xe buýt '{route.Code}' đang tạm dừng hoạt động.");
        }

        // 2. Phân giải DepartureAt.
        // Thiếu giờ khởi hành thì báo lỗi, không lấy DateTime.UtcNow làm mặc định: làm vậy
        // sẽ lặng lẽ tạo ra một chuyến khởi hành ngay lúc gọi API.
        if (!request.DepartureAt.HasValue && string.IsNullOrWhiteSpace(request.Date))
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                "Vui lòng nhập giờ khởi hành (DepartureAt) hoặc ngày chạy (Date) cho chuyến.");
        }

        DateTime departureAt = request.DepartureAt ?? default;
        if (!request.DepartureAt.HasValue)
        {
            if (!DateOnly.TryParse(request.Date, out var parsedDate))
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                    $"Ngày chạy '{request.Date}' không hợp lệ, cần dạng yyyy-MM-dd.");
            }

            var timePart = new TimeOnly(7, 30);
            if (!string.IsNullOrWhiteSpace(request.ShiftHours) && request.ShiftHours.Contains('—'))
            {
                var parts = request.ShiftHours.Split('—');
                if (TimeOnly.TryParse(parts[0].Trim(), out var parsedTime)) timePart = parsedTime;
            }
            else if (string.Equals(request.Shift, "CA_CHIEU", StringComparison.OrdinalIgnoreCase))
            {
                timePart = new TimeOnly(13, 30);
            }
            else if (string.Equals(request.Shift, "CA_TOI", StringComparison.OrdinalIgnoreCase))
            {
                timePart = new TimeOnly(18, 0);
            }

            // Giờ nhập vào là giờ Việt Nam, còn trips.DepartureAt lưu UTC (xem backend/README.md),
            // nên phải trừ đi độ lệch. Thiếu bước này thì chuyến lệch 7 tiếng và việc kiểm tra
            // trùng lịch so sai mốc thời gian.
            departureAt = DateTime.SpecifyKind(parsedDate.ToDateTime(timePart) - VietnamOffset, DateTimeKind.Utc);
        }

        var trip = new Trip
        {
            RouteId = route.Id,
            ScheduleId = request.ScheduleId,
            DepartureAt = departureAt,
            Status = TripStatus.Scheduled,
            DelayMinutes = 0
        };

        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);

        var assignReq = new AssignTripRequest
        {
            BusId = request.BusId,
            BusPlate = request.BusPlate,
            DriverId = request.DriverId,
            DriverName = request.DriverName,
            ConductorId = request.ConductorId,
            AssistantId = request.AssistantId,
            AssistantName = request.AssistantName,
            Notes = request.Notes
        };

        var assignRes = await AssignTripAsync(trip.Id, assignReq, ct);
        if (!assignRes.Ok)
        {
            db.Trips.Remove(trip);
            await db.SaveChangesAsync(ct);
            return assignRes;
        }

        return assignRes;
    }

    // ==========================================
    // 3. Tra cứu khả dụng & kiểm tra xung đột
    // ==========================================

    public async Task<IReadOnlyList<AvailableBusDto>> GetAvailableBusesAsync(DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct)
    {
        var duration = await GetRouteDurationMinutesAsync(routeId, ct);
        var allBuses = await db.Buses.AsNoTracking().OrderBy(b => b.PlateNumber).ToListAsync(ct);
        var result = new List<AvailableBusDto>();

        foreach (var b in allBuses)
        {
            if (b.Status == BusStatus.Maintenance)
            {
                result.Add(new AvailableBusDto
                {
                    Id = b.Id,
                    PlateNumber = b.PlateNumber,
                    Capacity = b.Capacity,
                    Status = b.Status,
                    IsAvailable = false,
                    UnavailableReason = "Xe đang bảo trì kỹ thuật"
                });
                continue;
            }

            if (b.Status == BusStatus.Inactive)
            {
                result.Add(new AvailableBusDto
                {
                    Id = b.Id,
                    PlateNumber = b.PlateNumber,
                    Capacity = b.Capacity,
                    Status = b.Status,
                    IsAvailable = false,
                    UnavailableReason = "Xe đang ngừng hoạt động"
                });
                continue;
            }

            var conflict = await FindConflictingTripForBusAsync(b.Id, departureAt, duration, excludeTripId, ct);
            if (conflict != null)
            {
                result.Add(new AvailableBusDto
                {
                    Id = b.Id,
                    PlateNumber = b.PlateNumber,
                    Capacity = b.Capacity,
                    Status = b.Status,
                    IsAvailable = false,
                    UnavailableReason = $"Xe đã được gán cho chuyến #{conflict.Id} ({conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}"
                });
                continue;
            }

            result.Add(new AvailableBusDto
            {
                Id = b.Id,
                PlateNumber = b.PlateNumber,
                Capacity = b.Capacity,
                Status = b.Status,
                IsAvailable = true,
                UnavailableReason = null
            });
        }

        return result;
    }

    public async Task<IReadOnlyList<AvailableStaffDto>> GetAvailableStaffAsync(StaffDuty duty, DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct)
    {
        var duration = await GetRouteDurationMinutesAsync(routeId, ct);
        var targetRole = duty == StaffDuty.Driver ? AccountRole.Driver : AccountRole.Conductor;

        var staffList = await db.Accounts.AsNoTracking()
            .Where(a => a.Role == targetRole)
            .OrderBy(a => a.FullName)
            .ToListAsync(ct);

        var result = new List<AvailableStaffDto>();

        foreach (var a in staffList)
        {
            if (!a.Active)
            {
                result.Add(new AvailableStaffDto
                {
                    AccountId = a.Id,
                    Username = a.Username,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Role = a.Role,
                    IsAvailable = false,
                    UnavailableReason = "Tài khoản nhân sự đang bị khóa"
                });
                continue;
            }

            var conflict = await FindConflictingTripForStaffAsync(a.Id, departureAt, duration, excludeTripId, ct);
            if (conflict != null)
            {
                result.Add(new AvailableStaffDto
                {
                    AccountId = a.Id,
                    Username = a.Username,
                    FullName = a.FullName,
                    Phone = a.Phone,
                    Role = a.Role,
                    IsAvailable = false,
                    UnavailableReason = $"Đã được phân công cho chuyến #{conflict.Id} ({conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}"
                });
                continue;
            }

            result.Add(new AvailableStaffDto
            {
                AccountId = a.Id,
                Username = a.Username,
                FullName = a.FullName,
                Phone = a.Phone,
                Role = a.Role,
                IsAvailable = true,
                UnavailableReason = null
            });
        }

        return result;
    }

    public async Task<ConflictCheckResponse> CheckConflictAsync(ConflictCheckRequest request, CancellationToken ct)
    {
        var conflicts = new List<string>();
        string? conflictingCode = null;

        // Phân giải departureAt
        DateTime departureAt = request.DepartureAt ?? DateTime.UtcNow;
        if (!request.DepartureAt.HasValue && !string.IsNullOrWhiteSpace(request.Date))
        {
            if (DateOnly.TryParse(request.Date, out var parsedDate))
            {
                var timePart = new TimeOnly(7, 30);
                if (!string.IsNullOrWhiteSpace(request.ShiftHours) && request.ShiftHours.Contains('—'))
                {
                    var parts = request.ShiftHours.Split('—');
                    if (TimeOnly.TryParse(parts[0].Trim(), out var parsedTime)) timePart = parsedTime;
                }
                else if (string.Equals(request.Shift, "CA_CHIEU", StringComparison.OrdinalIgnoreCase))
                {
                    timePart = new TimeOnly(13, 30);
                }
                else if (string.Equals(request.Shift, "CA_TOI", StringComparison.OrdinalIgnoreCase))
                {
                    timePart = new TimeOnly(18, 0);
                }

                // Giờ nhập vào là giờ Việt Nam, còn trips.DepartureAt lưu UTC (xem backend/README.md),
                // nên phải trừ đi độ lệch. Thiếu bước này thì chuyến lệch 7 tiếng và việc kiểm tra
                // trùng lịch so sai mốc thời gian.
                departureAt = DateTime.SpecifyKind(parsedDate.ToDateTime(timePart) - VietnamOffset, DateTimeKind.Utc);
            }
        }

        var duration = request.RouteId.HasValue ? await GetRouteDurationMinutesAsync(request.RouteId.Value, ct) : 60;
        var excludeTripId = request.ExcludeTripId ?? request.ExcludeId;

        // Phân giải BusId
        long? busId = request.BusId;
        if (!busId.HasValue && !string.IsNullOrWhiteSpace(request.BusPlate))
        {
            var cleanPlate = request.BusPlate.Trim().ToUpperInvariant();
            var b = await db.Buses.FirstOrDefaultAsync(x => x.PlateNumber == cleanPlate, ct);
            if (b != null) busId = b.Id;
        }

        // Phân giải DriverId
        long? driverId = request.DriverId;
        if (!driverId.HasValue && !string.IsNullOrWhiteSpace(request.DriverName))
        {
            var cleanDriver = request.DriverName.Trim();
            var d = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Driver &&
                (a.FullName == cleanDriver || a.Username == cleanDriver), ct);
            if (d != null) driverId = d.Id;
        }

        // Phân giải ConductorId
        long? conductorId = request.ConductorId;
        if (!conductorId.HasValue)
        {
            if (!string.IsNullOrWhiteSpace(request.AssistantId) && long.TryParse(request.AssistantId, out var parsedAId))
            {
                conductorId = parsedAId;
            }
            else if (!string.IsNullOrWhiteSpace(request.AssistantName))
            {
                var cleanAsst = request.AssistantName.Trim();
                var c = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Conductor &&
                    (a.FullName == cleanAsst || a.Username == cleanAsst), ct);
                if (c != null) conductorId = c.Id;
            }
        }

        // 1. Kiểm tra xe
        if (busId.HasValue)
        {
            var bus = await db.Buses.FindAsync([busId.Value], ct);
            if (bus == null)
            {
                conflicts.Add($"Xe buýt với ID {busId.Value} không tồn tại.");
            }
            else
            {
                if (bus.Status != BusStatus.Active)
                {
                    conflicts.Add($"Xe '{bus.PlateNumber}' không thể phân công do đang ở trạng thái '{FormatBusStatus(bus.Status)}'.");
                }

                var conflict = await FindConflictingTripForBusAsync(busId.Value, departureAt, duration, excludeTripId, ct);
                if (conflict != null)
                {
                    conflictingCode = $"ASN-{conflict.Id}";
                    conflicts.Add($"Xe '{bus.PlateNumber}' đã được gán cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        // 2. Kiểm tra trùng tài xế và phụ xe
        if (driverId.HasValue && conductorId.HasValue && driverId.Value == conductorId.Value)
        {
            conflicts.Add("Tài xế và phụ xe không được là cùng một người.");
        }

        // 3. Kiểm tra tài xế
        if (driverId.HasValue)
        {
            var driver = await db.Accounts.FindAsync([driverId.Value], ct);
            if (driver == null)
            {
                conflicts.Add($"Tài xế với ID {driverId.Value} không tồn tại.");
            }
            else
            {
                if (!driver.Active) conflicts.Add($"Tài xế '{driver.FullName}' đang bị khóa tài khoản.");
                if (driver.Role != AccountRole.Driver) conflicts.Add($"Tài khoản '{driver.FullName}' không có vai trò Tài xế.");

                var conflict = await FindConflictingTripForStaffAsync(driverId.Value, departureAt, duration, excludeTripId, ct);
                if (conflict != null)
                {
                    conflictingCode ??= $"ASN-{conflict.Id}";
                    conflicts.Add($"Tài xế '{driver.FullName}' đã được phân công cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        // 4. Kiểm tra phụ xe
        if (conductorId.HasValue)
        {
            var conductor = await db.Accounts.FindAsync([conductorId.Value], ct);
            if (conductor == null)
            {
                conflicts.Add($"Phụ xe với ID {conductorId.Value} không tồn tại.");
            }
            else
            {
                if (!conductor.Active) conflicts.Add($"Phụ xe '{conductor.FullName}' đang bị khóa tài khoản.");
                if (conductor.Role != AccountRole.Conductor) conflicts.Add($"Tài khoản '{conductor.FullName}' không có vai trò Phụ xe.");

                var conflict = await FindConflictingTripForStaffAsync(conductorId.Value, departureAt, duration, excludeTripId, ct);
                if (conflict != null)
                {
                    conflictingCode ??= $"ASN-{conflict.Id}";
                    conflicts.Add($"Phụ xe '{conductor.FullName}' đã được phân công cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        return new ConflictCheckResponse
        {
            HasConflict = conflicts.Count > 0,
            Conflicts = conflicts,
            ConflictingAssignmentCode = conflictingCode
        };
    }

    // ==========================================
    // 4. Ca trực cá nhân (My Schedule)
    // ==========================================

    public async Task<IReadOnlyList<DriverScheduleDto>> GetMyScheduleAsync(long accountId, DateOnly? date, CancellationToken ct)
    {
        var query = db.TripStaff
            .Include(ts => ts.Trip).ThenInclude(t => t.BusRoute)
            .Include(ts => ts.Trip).ThenInclude(t => t.Bus)
            .Include(ts => ts.Trip).ThenInclude(t => t.TripStaff).ThenInclude(other => other.Account)
            .Where(ts => ts.AccountId == accountId)
            .AsNoTracking();

        if (date.HasValue)
        {
            // Ngày lọc là ngày Việt Nam (UTC+7), còn trips.DepartureAt lưu UTC nên phải đổi mốc đầu/cuối ngày sang UTC.
            var startUtc = DateTime.SpecifyKind(date.Value.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);
            var endUtc = DateTime.SpecifyKind(date.Value.ToDateTime(TimeOnly.MaxValue) - VietnamOffset, DateTimeKind.Utc);
            query = query.Where(ts => ts.Trip.DepartureAt >= startUtc && ts.Trip.DepartureAt <= endUtc);
        }

        var staffTrips = await query
            .OrderBy(ts => ts.Trip.DepartureAt)
            .ToListAsync(ct);

        var routeIds = staffTrips.Select(ts => ts.Trip.RouteId).Distinct().ToList();

        var routeStops = await db.RouteStops
            .Include(rs => rs.Stop)
            .Where(rs => routeIds.Contains(rs.RouteId))
            .OrderBy(rs => rs.RouteId).ThenBy(rs => rs.StopOrder)
            .ToListAsync(ct);

        var routeDurationLookup = routeStops
            .GroupBy(rs => rs.RouteId)
            .ToDictionary(g => g.Key, g => g.Max(rs => rs.MinutesFromStart) > 0 ? g.Max(rs => rs.MinutesFromStart) : 60);

        var stopsLookup = routeStops
            .GroupBy(rs => rs.RouteId)
            .ToDictionary(g => g.Key, g => g.Select(rs => new RouteStopSummaryDto
            {
                StopId = rs.StopId,
                StopName = rs.Stop.Name,
                StopOrder = rs.StopOrder,
                MinutesFromStart = rs.MinutesFromStart
            }).ToList());

        return staffTrips.Select(ts =>
        {
            var t = ts.Trip;
            var duration = routeDurationLookup.GetValueOrDefault(t.RouteId, 60);
            var partner = t.TripStaff.FirstOrDefault(other => other.AccountId != accountId);

            return new DriverScheduleDto
            {
                TripId = t.Id,
                RouteId = t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                StartPoint = t.BusRoute.StartPoint,
                EndPoint = t.BusRoute.EndPoint,
                DepartureAt = t.DepartureAt,
                EstimatedArrivalAt = t.DepartureAt.AddMinutes(duration + t.DelayMinutes),
                Status = t.Status,
                Duty = ts.Duty.ToString().ToUpperInvariant(),
                BusPlate = t.Bus?.PlateNumber,
                BusCapacity = t.Bus?.Capacity,
                PartnerName = partner?.Account.FullName,
                PartnerPhone = partner?.Account.Phone,
                PartnerDuty = partner?.Duty.ToString().ToUpperInvariant(),
                Stops = stopsLookup.GetValueOrDefault(t.RouteId, [])
            };
        }).ToList();
    }
}
