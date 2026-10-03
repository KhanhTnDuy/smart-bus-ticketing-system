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

    // Chuyến chạy công khai (dành cho Hành khách / Khách vãng lai tra cứu)
    Task<PagedResponse<PublicTripDto>> GetPublicTripsAsync(PublicTripFilter filter, int page, int pageSize, CancellationToken ct);
    Task<PublicTripDto?> GetPublicTripByIdAsync(long tripId, CancellationToken ct);

    // Thao tác quản lý chuyến chạy
    Task<ServiceResult<TripAssignmentDto>> CreateTripWithAssignmentAsync(CreateTripRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteTripAsync(long tripId, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> UpdateTripStatusAsync(long tripId, UpdateTripStatusRequest request, CancellationToken ct);

    // Tra cứu khả dụng & kiểm tra xung đột
    Task<IReadOnlyList<AvailableBusDto>> GetAvailableBusesAsync(DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<IReadOnlyList<AvailableStaffDto>> GetAvailableStaffAsync(StaffDuty duty, DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<ConflictCheckResponse> CheckConflictAsync(ConflictCheckRequest request, CancellationToken ct);

    // Tra cứu ca trực cá nhân của Tài xế / Phụ xe
    Task<IReadOnlyList<DriverScheduleDto>> GetMyScheduleAsync(long accountId, DateOnly? date, CancellationToken ct);
}

public sealed class TripAssignmentService(AppDbContext db) : ITripAssignmentService
{
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

    public async Task<PagedResponse<TripAssignmentDto>> GetAssignmentsAsync(TripAssignmentFilter filter, int page, int pageSize, CancellationToken ct)
    {
        var (normPage, normPageSize) = Normalize(page, pageSize);
        var query = db.Trips
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
            .Include(t => t.Bookings)
            .AsNoTracking();

        if (filter.RouteId.HasValue)
            query = query.Where(t => t.RouteId == filter.RouteId.Value);

        if (filter.Date.HasValue)
        {
            var date = filter.Date.Value;
            var startUtc = date.ToDateTime(TimeOnly.MinValue);
            var endUtc = date.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(t => t.DepartureAt >= startUtc && t.DepartureAt <= endUtc);
        }

        if (filter.FromUtc.HasValue)
            query = query.Where(t => t.DepartureAt >= filter.FromUtc.Value);

        if (filter.ToUtc.HasValue)
            query = query.Where(t => t.DepartureAt <= filter.ToUtc.Value);

        if (filter.Status.HasValue)
            query = query.Where(t => t.Status == filter.Status.Value);

        if (filter.BusId.HasValue)
            query = query.Where(t => t.BusId == filter.BusId.Value);

        if (filter.DriverId.HasValue)
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.DriverId.Value && ts.Duty == StaffDuty.Driver));

        if (filter.ConductorId.HasValue)
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.ConductorId.Value && ts.Duty == StaffDuty.Conductor));

        // Ràng buộc bảo mật: Nếu là tài xế / phụ xe tra cứu thì chỉ xem được chuyến của chính mình
        if (filter.StaffAccountId.HasValue)
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.StaffAccountId.Value));

        if (filter.State.HasValue)
        {
            query = filter.State.Value switch
            {
                AssignmentStateFilter.FullyAssigned => query.Where(t => t.BusId != null && t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver)),
                AssignmentStateFilter.PartiallyAssigned => query.Where(t => (t.BusId != null || t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver))
                    && !(t.BusId != null && t.TripStaff.Any(ts => ts.Duty == StaffDuty.Driver))),
                AssignmentStateFilter.Unassigned => query.Where(t => t.BusId == null && !t.TripStaff.Any()),
                _ => query
            };
        }

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
            .OrderBy(t => t.DepartureAt)
            .Skip((normPage - 1) * normPageSize)
            .Take(normPageSize)
            .ToListAsync(ct);

        var routeIds = trips.Select(t => t.RouteId).Distinct().ToList();
        var routeDurations = await GetRouteDurationsAsync(routeIds, ct);

        var data = trips.Select(t =>
        {
            var duration = routeDurations.GetValueOrDefault(t.RouteId, 60);
            var driverStaff = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver);
            var conductorStaff = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor);

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
                Bus = t.Bus == null ? null : new BusAssignmentInfo
                {
                    Id = t.Bus.Id,
                    PlateNumber = t.Bus.PlateNumber,
                    Capacity = t.Bus.Capacity,
                    Status = t.Bus.Status
                },
                Driver = driverStaff == null ? null : new StaffAssignmentInfo
                {
                    AccountId = driverStaff.AccountId,
                    Username = driverStaff.Account.Username,
                    FullName = driverStaff.Account.FullName,
                    Phone = driverStaff.Account.Phone,
                    Duty = StaffDuty.Driver
                },
                Conductor = conductorStaff == null ? null : new StaffAssignmentInfo
                {
                    AccountId = conductorStaff.AccountId,
                    Username = conductorStaff.Account.Username,
                    FullName = conductorStaff.Account.FullName,
                    Phone = conductorStaff.Account.Phone,
                    Duty = StaffDuty.Conductor
                },
                BookedTicketsCount = t.Bookings.Count(b => b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.Pending)
            };
        }).ToList();

        return new PagedResponse<TripAssignmentDto>
        {
            Data = data,
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
        var driverStaff = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver);
        var conductorStaff = t.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor);

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
            Bus = t.Bus == null ? null : new BusAssignmentInfo
            {
                Id = t.Bus.Id,
                PlateNumber = t.Bus.PlateNumber,
                Capacity = t.Bus.Capacity,
                Status = t.Bus.Status
            },
            Driver = driverStaff == null ? null : new StaffAssignmentInfo
            {
                AccountId = driverStaff.AccountId,
                Username = driverStaff.Account.Username,
                FullName = driverStaff.Account.FullName,
                Phone = driverStaff.Account.Phone,
                Duty = StaffDuty.Driver
            },
            Conductor = conductorStaff == null ? null : new StaffAssignmentInfo
            {
                AccountId = conductorStaff.AccountId,
                Username = conductorStaff.Account.Username,
                FullName = conductorStaff.Account.FullName,
                Phone = conductorStaff.Account.Phone,
                Duty = StaffDuty.Conductor
            },
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

            // 1. Kiểm tra xe buýt
            if (request.BusId.HasValue)
            {
                var bus = await db.Buses.FindAsync([request.BusId.Value], ct);
                if (bus == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy xe buýt với ID {request.BusId.Value}.");
                }
                if (bus.Status != BusStatus.Active)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Xe buýt '{bus.PlateNumber}' đang ở trạng thái '{FormatBusStatus(bus.Status)}', không thể phân công vào chuyến chạy.");
                }

                // Kiểm tra trùng lịch xe buýt (otherStart < thisEnd && thisStart < otherEnd)
                var busConflict = await FindConflictingTripForBusAsync(request.BusId.Value, trip.DepartureAt, duration, tripId, ct);
                if (busConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Xe buýt '{bus.PlateNumber}' đã được gán cho chuyến #{busConflict.Id} (Tuyến {busConflict.BusRoute.Code}) lúc {busConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }

                trip.BusId = request.BusId.Value;
            }
            else
            {
                trip.BusId = null;
            }

            // 2. Kiểm tra tài xế & phụ xe không được là cùng một người
            if (request.DriverId.HasValue && request.ConductorId.HasValue && request.DriverId.Value == request.ConductorId.Value)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Invalid,
                    "Tài xế và phụ xe không được là cùng một người.");
            }

            // 3. Kiểm tra tài xế
            if (request.DriverId.HasValue)
            {
                var driver = await db.Accounts.FindAsync([request.DriverId.Value], ct);
                if (driver == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy tài xế với ID {request.DriverId.Value}.");
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
                var driverConflict = await FindConflictingTripForStaffAsync(request.DriverId.Value, trip.DepartureAt, duration, tripId, ct);
                if (driverConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Tài xế '{driver.FullName}' đã được phân công cho chuyến #{driverConflict.Id} (Tuyến {driverConflict.BusRoute.Code}) lúc {driverConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }

            // 4. Kiểm tra phụ xe
            if (request.ConductorId.HasValue)
            {
                var conductor = await db.Accounts.FindAsync([request.ConductorId.Value], ct);
                if (conductor == null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy phụ xe với ID {request.ConductorId.Value}.");
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
                var conductorConflict = await FindConflictingTripForStaffAsync(request.ConductorId.Value, trip.DepartureAt, duration, tripId, ct);
                if (conductorConflict != null)
                {
                    return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                        $"Phụ xe '{conductor.FullName}' đã được phân công cho chuyến #{conductorConflict.Id} (Tuyến {conductorConflict.BusRoute.Code}) lúc {conductorConflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }

            // 5. Cập nhật nhân sự chuyến (TripStaff)
            var existingStaff = await db.TripStaff.Where(ts => ts.TripId == tripId).ToListAsync(ct);
            db.TripStaff.RemoveRange(existingStaff);

            if (request.DriverId.HasValue)
            {
                db.TripStaff.Add(new TripStaff
                {
                    TripId = tripId,
                    AccountId = request.DriverId.Value,
                    Duty = StaffDuty.Driver
                });
            }

            if (request.ConductorId.HasValue)
            {
                db.TripStaff.Add(new TripStaff
                {
                    TripId = tripId,
                    AccountId = request.ConductorId.Value,
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
                result.Errors.Add(new BatchAssignErrorItem
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
    // 2. Chuyến chạy công khai (Public Trips)
    // ==========================================

    public async Task<PagedResponse<PublicTripDto>> GetPublicTripsAsync(PublicTripFilter filter, int page, int pageSize, CancellationToken ct)
    {
        var (normPage, normPageSize) = Normalize(page, pageSize);
        var query = db.Trips
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .AsNoTracking();

        if (filter.RouteId.HasValue)
            query = query.Where(t => t.RouteId == filter.RouteId.Value);

        if (filter.Date.HasValue)
        {
            var date = filter.Date.Value;
            var startUtc = date.ToDateTime(TimeOnly.MinValue);
            var endUtc = date.ToDateTime(TimeOnly.MaxValue);
            query = query.Where(t => t.DepartureAt >= startUtc && t.DepartureAt <= endUtc);
        }

        if (filter.FromUtc.HasValue)
            query = query.Where(t => t.DepartureAt >= filter.FromUtc.Value);

        if (filter.ToUtc.HasValue)
            query = query.Where(t => t.DepartureAt <= filter.ToUtc.Value);

        if (filter.Status.HasValue)
            query = query.Where(t => t.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(t =>
                t.BusRoute.Code.ToLower().Contains(term) ||
                t.BusRoute.Name.ToLower().Contains(term) ||
                (t.Bus != null && t.Bus.PlateNumber.ToLower().Contains(term)));
        }

        var total = await query.CountAsync(ct);

        var trips = await query
            .OrderBy(t => t.DepartureAt)
            .Skip((normPage - 1) * normPageSize)
            .Take(normPageSize)
            .ToListAsync(ct);

        var routeIds = trips.Select(t => t.RouteId).Distinct().ToList();
        var routeDurations = await GetRouteDurationsAsync(routeIds, ct);

        var data = trips.Select(t =>
        {
            var duration = routeDurations.GetValueOrDefault(t.RouteId, 60);
            return new PublicTripDto
            {
                TripId = t.Id,
                RouteId = t.RouteId,
                RouteCode = t.BusRoute.Code,
                RouteName = t.BusRoute.Name,
                RouteStartPoint = t.BusRoute.StartPoint,
                RouteEndPoint = t.BusRoute.EndPoint,
                DepartureAt = t.DepartureAt,
                EstimatedDurationMinutes = duration,
                EstimatedArrivalAt = t.DepartureAt.AddMinutes(duration + t.DelayMinutes),
                Status = t.Status,
                StatusText = FormatTripStatus(t.Status),
                DelayMinutes = t.DelayMinutes,
                BusPlate = t.Bus?.PlateNumber,
                BusCapacity = t.Bus?.Capacity
            };
        }).ToList();

        return new PagedResponse<PublicTripDto>
        {
            Data = data,
            Page = normPage,
            PageSize = normPageSize,
            Total = total
        };
    }

    public async Task<PublicTripDto?> GetPublicTripByIdAsync(long tripId, CancellationToken ct)
    {
        var t = await db.Trips
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tripId, ct);

        if (t == null) return null;

        var duration = await GetRouteDurationMinutesAsync(t.RouteId, ct);
        return new PublicTripDto
        {
            TripId = t.Id,
            RouteId = t.RouteId,
            RouteCode = t.BusRoute.Code,
            RouteName = t.BusRoute.Name,
            RouteStartPoint = t.BusRoute.StartPoint,
            RouteEndPoint = t.BusRoute.EndPoint,
            DepartureAt = t.DepartureAt,
            EstimatedDurationMinutes = duration,
            EstimatedArrivalAt = t.DepartureAt.AddMinutes(duration + t.DelayMinutes),
            Status = t.Status,
            StatusText = FormatTripStatus(t.Status),
            DelayMinutes = t.DelayMinutes,
            BusPlate = t.Bus?.PlateNumber,
            BusCapacity = t.Bus?.Capacity
        };
    }

    // ==========================================
    // 3. Thao tác quản lý chuyến chạy
    // ==========================================

    public async Task<ServiceResult<TripAssignmentDto>> CreateTripWithAssignmentAsync(CreateTripRequest request, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([request.RouteId], ct);
        if (route == null)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy tuyến xe buýt với ID {request.RouteId}.");
        }

        if (!route.Active)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict, $"Tuyến xe buýt '{route.Code}' đang tạm dừng hoạt động.");
        }

        var trip = new Trip
        {
            RouteId = request.RouteId,
            ScheduleId = request.ScheduleId,
            DepartureAt = request.DepartureAt,
            Status = TripStatus.Scheduled,
            DelayMinutes = 0
        };

        db.Trips.Add(trip);
        await db.SaveChangesAsync(ct);

        if (request.BusId.HasValue || request.DriverId.HasValue || request.ConductorId.HasValue)
        {
            var assignRes = await AssignTripAsync(trip.Id, new AssignTripRequest
            {
                BusId = request.BusId,
                DriverId = request.DriverId,
                ConductorId = request.ConductorId
            }, ct);

            if (!assignRes.Ok)
            {
                db.Trips.Remove(trip);
                await db.SaveChangesAsync(ct);
                return assignRes;
            }

            return assignRes;
        }

        var dto = await GetAssignmentByIdAsync(trip.Id, ct);
        return ServiceResult<TripAssignmentDto>.Success(dto!);
    }

    public async Task<ServiceResult<bool>> DeleteTripAsync(long tripId, CancellationToken ct)
    {
        var trip = await db.Trips
            .Include(t => t.Bookings)
            .Include(t => t.TripStaff)
            .FirstOrDefaultAsync(t => t.Id == tripId, ct);

        if (trip == null)
        {
            return ServiceResult<bool>.Fail(ServiceError.NotFound, $"Không tìm thấy chuyến chạy có ID {tripId}.");
        }

        var hasBookings = trip.Bookings.Any(b => b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Expired);
        if (hasBookings)
        {
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                $"Chuyến chạy #{tripId} đã có hành khách đặt chỗ hoặc mua vé. Hãy chuyển trạng thái chuyến sang 'Đã hủy' thay vì xóa.");
        }

        db.TripStaff.RemoveRange(trip.TripStaff);
        db.Trips.Remove(trip);
        await db.SaveChangesAsync(ct);

        return ServiceResult<bool>.Success(true);
    }

    public async Task<ServiceResult<TripAssignmentDto>> UpdateTripStatusAsync(long tripId, UpdateTripStatusRequest request, CancellationToken ct)
    {
        var trip = await db.Trips.FindAsync([tripId], ct);
        if (trip == null)
        {
            return ServiceResult<TripAssignmentDto>.Fail(ServiceError.NotFound, $"Không tìm thấy chuyến chạy có ID {tripId}.");
        }

        trip.Status = request.Status;
        trip.DelayMinutes = request.DelayMinutes;
        await db.SaveChangesAsync(ct);

        var dto = await GetAssignmentByIdAsync(tripId, ct);
        return ServiceResult<TripAssignmentDto>.Success(dto!);
    }

    // ==========================================
    // 4. Tra cứu khả dụng & kiểm tra xung đột
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
        var duration = await GetRouteDurationMinutesAsync(request.RouteId, ct);

        // 1. Kiểm tra xe
        if (request.BusId.HasValue)
        {
            var bus = await db.Buses.FindAsync([request.BusId.Value], ct);
            if (bus == null)
            {
                conflicts.Add($"Xe buýt với ID {request.BusId.Value} không tồn tại.");
            }
            else
            {
                if (bus.Status != BusStatus.Active)
                {
                    conflicts.Add($"Xe '{bus.PlateNumber}' không thể phân công do đang ở trạng thái '{FormatBusStatus(bus.Status)}'.");
                }

                var conflict = await FindConflictingTripForBusAsync(request.BusId.Value, request.DepartureAt, duration, request.ExcludeTripId, ct);
                if (conflict != null)
                {
                    conflicts.Add($"Xe '{bus.PlateNumber}' đã được gán cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        // 2. Kiểm tra trùng tài xế và phụ xe
        if (request.DriverId.HasValue && request.ConductorId.HasValue && request.DriverId.Value == request.ConductorId.Value)
        {
            conflicts.Add("Tài xế và phụ xe không được là cùng một người.");
        }

        // 3. Kiểm tra tài xế
        if (request.DriverId.HasValue)
        {
            var driver = await db.Accounts.FindAsync([request.DriverId.Value], ct);
            if (driver == null)
            {
                conflicts.Add($"Tài xế với ID {request.DriverId.Value} không tồn tại.");
            }
            else
            {
                if (!driver.Active) conflicts.Add($"Tài xế '{driver.FullName}' đang bị khóa tài khoản.");
                if (driver.Role != AccountRole.Driver) conflicts.Add($"Tài khoản '{driver.FullName}' không có vai trò Tài xế.");

                var conflict = await FindConflictingTripForStaffAsync(request.DriverId.Value, request.DepartureAt, duration, request.ExcludeTripId, ct);
                if (conflict != null)
                {
                    conflicts.Add($"Tài xế '{driver.FullName}' đã được phân công cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        // 4. Kiểm tra phụ xe
        if (request.ConductorId.HasValue)
        {
            var conductor = await db.Accounts.FindAsync([request.ConductorId.Value], ct);
            if (conductor == null)
            {
                conflicts.Add($"Phụ xe với ID {request.ConductorId.Value} không tồn tại.");
            }
            else
            {
                if (!conductor.Active) conflicts.Add($"Phụ xe '{conductor.FullName}' đang bị khóa tài khoản.");
                if (conductor.Role != AccountRole.Conductor) conflicts.Add($"Tài khoản '{conductor.FullName}' không có vai trò Phụ xe.");

                var conflict = await FindConflictingTripForStaffAsync(request.ConductorId.Value, request.DepartureAt, duration, request.ExcludeTripId, ct);
                if (conflict != null)
                {
                    conflicts.Add($"Phụ xe '{conductor.FullName}' đã được phân công cho chuyến #{conflict.Id} (Tuyến {conflict.BusRoute.Code}) lúc {conflict.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        return new ConflictCheckResponse
        {
            HasConflict = conflicts.Count > 0,
            Conflicts = conflicts
        };
    }

    // ==========================================
    // 5. Ca trực cá nhân (My Schedule)
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
            var startUtc = date.Value.ToDateTime(TimeOnly.MinValue);
            var endUtc = date.Value.ToDateTime(TimeOnly.MaxValue);
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
