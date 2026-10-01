using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public interface ITripAssignmentService
{
    Task<PagedResponse<TripAssignmentDto>> GetAssignmentsAsync(TripAssignmentFilter filter, int page, int pageSize, CancellationToken ct);
    Task<TripAssignmentDto?> GetAssignmentByIdAsync(long tripId, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> AssignTripAsync(long tripId, AssignTripRequest request, CancellationToken ct);
    Task<ServiceResult<BatchAssignResultDto>> BatchAssignAsync(BatchAssignTripRequest request, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> UnassignTripAsync(long tripId, UnassignTripRequest request, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> CreateTripWithAssignmentAsync(CreateTripRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteTripAsync(long tripId, CancellationToken ct);
    Task<ServiceResult<TripAssignmentDto>> UpdateTripStatusAsync(long tripId, UpdateTripStatusRequest request, CancellationToken ct);

    Task<IReadOnlyList<AvailableBusDto>> GetAvailableBusesAsync(DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<IReadOnlyList<AvailableStaffDto>> GetAvailableStaffAsync(StaffDuty duty, DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct);
    Task<ConflictCheckResponse> CheckConflictAsync(ConflictCheckRequest request, CancellationToken ct);
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
        {
            query = query.Where(t => t.RouteId == filter.RouteId.Value);
        }

        if (filter.Date.HasValue)
        {
            var date = filter.Date.Value;
            var startUtc = date.ToDateTime(TimeOnly.MinValue);
            var endUtc = date.ToDateTime(TimeOnly.MaxValue);
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

        if (filter.Status.HasValue)
        {
            query = query.Where(t => t.Status == filter.Status.Value);
        }

        if (filter.BusId.HasValue)
        {
            query = query.Where(t => t.BusId == filter.BusId.Value);
        }

        if (filter.DriverId.HasValue)
        {
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.DriverId.Value && ts.Duty == StaffDuty.Driver));
        }

        if (filter.ConductorId.HasValue)
        {
            query = query.Where(t => t.TripStaff.Any(ts => ts.AccountId == filter.ConductorId.Value && ts.Duty == StaffDuty.Conductor));
        }

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

        // Lấy danh sách thời lượng tuyến để tính giờ đến ước tính
        var routeIds = trips.Select(t => t.RouteId).Distinct().ToList();
        var routeDurations = await db.RouteStops
            .Where(rs => routeIds.Contains(rs.RouteId))
            .GroupBy(rs => rs.RouteId)
            .Select(g => new { RouteId = g.Key, MaxMinutes = g.Max(rs => rs.MinutesFromStart) })
            .ToDictionaryAsync(x => x.RouteId, x => x.MaxMinutes > 0 ? x.MaxMinutes : 60, ct);

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

    public async Task<ServiceResult<TripAssignmentDto>> AssignTripAsync(long tripId, AssignTripRequest request, CancellationToken ct)
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
        var tripStart = trip.DepartureAt;
        var tripEnd = tripStart.AddMinutes(duration + 15); // Cộng 15 phút đệm quay đầu xe / giao ca

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

            // Kiểm tra trùng lịch xe
            var busConflict = await db.Trips
                .Where(t => t.Id != tripId && t.BusId == request.BusId.Value &&
                    (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running))
                .AnyAsync(t => t.DepartureAt >= tripStart.AddMinutes(-duration) && t.DepartureAt <= tripEnd, ct);

            if (busConflict)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                    $"Xe buýt '{bus.PlateNumber}' đã được gán cho một chuyến chạy khác trong khoảng thời gian này.");
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

            // Kiểm tra tài xế có bị trùng chuyến chạy khác
            var driverConflict = await db.TripStaff
                .Where(ts => ts.TripId != tripId && ts.AccountId == request.DriverId.Value &&
                    (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running))
                .AnyAsync(ts => ts.Trip.DepartureAt >= tripStart.AddMinutes(-duration) && ts.Trip.DepartureAt <= tripEnd, ct);

            if (driverConflict)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                    $"Tài xế '{driver.FullName}' đã được phân công cho một chuyến chạy khác trong khoảng thời gian này.");
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

            // Kiểm tra phụ xe có bị trùng chuyến chạy khác
            var conductorConflict = await db.TripStaff
                .Where(ts => ts.TripId != tripId && ts.AccountId == request.ConductorId.Value &&
                    (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running))
                .AnyAsync(ts => ts.Trip.DepartureAt >= tripStart.AddMinutes(-duration) && ts.Trip.DepartureAt <= tripEnd, ct);

            if (conductorConflict)
            {
                return ServiceResult<TripAssignmentDto>.Fail(ServiceError.Conflict,
                    $"Phụ xe '{conductor.FullName}' đã được phân công cho một chuyến chạy khác trong khoảng thời gian này.");
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

        var dto = await GetAssignmentByIdAsync(tripId, ct);
        return ServiceResult<TripAssignmentDto>.Success(dto!);
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

        // Nếu có thông tin xe hoặc tài xế / phụ xe đi kèm thì thực hiện gán
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
                // Nếu gán thất bại thì hoàn tác tạo trip
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

    public async Task<IReadOnlyList<AvailableBusDto>> GetAvailableBusesAsync(DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct)
    {
        var duration = await GetRouteDurationMinutesAsync(routeId, ct);
        var tripStart = departureAt;
        var tripEnd = tripStart.AddMinutes(duration + 15);

        // Lấy danh sách ID các xe đang bận
        var busyBusIds = await db.Trips
            .Where(t => t.BusId != null &&
                (!excludeTripId.HasValue || t.Id != excludeTripId.Value) &&
                (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running) &&
                t.DepartureAt >= tripStart.AddMinutes(-duration) && t.DepartureAt <= tripEnd)
            .Select(t => t.BusId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var allBuses = await db.Buses.AsNoTracking().OrderBy(b => b.PlateNumber).ToListAsync(ct);

        return allBuses.Select(b =>
        {
            bool isBusy = busyBusIds.Contains(b.Id);
            bool isMaintenance = b.Status == BusStatus.Maintenance;
            bool isInactive = b.Status == BusStatus.Inactive;

            bool isAvail = !isBusy && !isMaintenance && !isInactive;
            string? reason = null;

            if (isMaintenance) reason = "Xe đang bảo trì kỹ thuật";
            else if (isInactive) reason = "Xe đang ngừng hoạt động";
            else if (isBusy) reason = "Xe đã được gán chuyến chạy khác cùng khung giờ";

            return new AvailableBusDto
            {
                Id = b.Id,
                PlateNumber = b.PlateNumber,
                Capacity = b.Capacity,
                Status = b.Status,
                IsAvailable = isAvail,
                UnavailableReason = reason
            };
        }).ToList();
    }

    public async Task<IReadOnlyList<AvailableStaffDto>> GetAvailableStaffAsync(StaffDuty duty, DateTime departureAt, long routeId, long? excludeTripId, CancellationToken ct)
    {
        var duration = await GetRouteDurationMinutesAsync(routeId, ct);
        var tripStart = departureAt;
        var tripEnd = tripStart.AddMinutes(duration + 15);

        var targetRole = duty == StaffDuty.Driver ? AccountRole.Driver : AccountRole.Conductor;

        // Lấy danh sách ID các nhân viên đang bận chạy chuyến khác
        var busyAccountIds = await db.TripStaff
            .Where(ts => (!excludeTripId.HasValue || ts.TripId != excludeTripId.Value) &&
                (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running) &&
                ts.Trip.DepartureAt >= tripStart.AddMinutes(-duration) && ts.Trip.DepartureAt <= tripEnd)
            .Select(ts => ts.AccountId)
            .Distinct()
            .ToListAsync(ct);

        var staffList = await db.Accounts.AsNoTracking()
            .Where(a => a.Role == targetRole)
            .OrderBy(a => a.FullName)
            .ToListAsync(ct);

        return staffList.Select(a =>
        {
            bool isBusy = busyAccountIds.Contains(a.Id);
            bool isInactive = !a.Active;
            bool isAvail = !isBusy && !isInactive;

            string? reason = null;
            if (isInactive) reason = "Tài khoản nhân sự đang bị khóa";
            else if (isBusy) reason = "Đã được phân công chạy chuyến khác cùng khung giờ";

            return new AvailableStaffDto
            {
                AccountId = a.Id,
                Username = a.Username,
                FullName = a.FullName,
                Phone = a.Phone,
                Role = a.Role,
                IsAvailable = isAvail,
                UnavailableReason = reason
            };
        }).ToList();
    }

    public async Task<ConflictCheckResponse> CheckConflictAsync(ConflictCheckRequest request, CancellationToken ct)
    {
        var conflicts = new List<string>();
        var duration = await GetRouteDurationMinutesAsync(request.RouteId, ct);
        var tripStart = request.DepartureAt;
        var tripEnd = tripStart.AddMinutes(duration + 15);

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

                var conflictingTrip = await db.Trips
                    .Include(t => t.BusRoute)
                    .Where(t => (!request.ExcludeTripId.HasValue || t.Id != request.ExcludeTripId.Value) &&
                        t.BusId == request.BusId.Value &&
                        (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running) &&
                        t.DepartureAt >= tripStart.AddMinutes(-duration) && t.DepartureAt <= tripEnd)
                    .FirstOrDefaultAsync(ct);

                if (conflictingTrip != null)
                {
                    conflicts.Add($"Xe '{bus.PlateNumber}' đã được gán cho chuyến #{conflictingTrip.Id} (Tuyến {conflictingTrip.BusRoute.Code}) lúc {conflictingTrip.DepartureAt:HH:mm dd/MM/yyyy}.");
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

                var conflictingTrip = await db.TripStaff
                    .Include(ts => ts.Trip).ThenInclude(t => t.BusRoute)
                    .Where(ts => (!request.ExcludeTripId.HasValue || ts.TripId != request.ExcludeTripId.Value) &&
                        ts.AccountId == request.DriverId.Value &&
                        (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running) &&
                        ts.Trip.DepartureAt >= tripStart.AddMinutes(-duration) && ts.Trip.DepartureAt <= tripEnd)
                    .Select(ts => ts.Trip)
                    .FirstOrDefaultAsync(ct);

                if (conflictingTrip != null)
                {
                    conflicts.Add($"Tài xế '{driver.FullName}' đã được phân công cho chuyến #{conflictingTrip.Id} (Tuyến {conflictingTrip.BusRoute.Code}) lúc {conflictingTrip.DepartureAt:HH:mm dd/MM/yyyy}.");
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

                var conflictingTrip = await db.TripStaff
                    .Include(ts => ts.Trip).ThenInclude(t => t.BusRoute)
                    .Where(ts => (!request.ExcludeTripId.HasValue || ts.TripId != request.ExcludeTripId.Value) &&
                        ts.AccountId == request.ConductorId.Value &&
                        (ts.Trip.Status == TripStatus.Scheduled || ts.Trip.Status == TripStatus.Running) &&
                        ts.Trip.DepartureAt >= tripStart.AddMinutes(-duration) && ts.Trip.DepartureAt <= tripEnd)
                    .Select(ts => ts.Trip)
                    .FirstOrDefaultAsync(ct);

                if (conflictingTrip != null)
                {
                    conflicts.Add($"Phụ xe '{conductor.FullName}' đã được phân công cho chuyến #{conflictingTrip.Id} (Tuyến {conflictingTrip.BusRoute.Code}) lúc {conflictingTrip.DepartureAt:HH:mm dd/MM/yyyy}.");
                }
            }
        }

        return new ConflictCheckResponse
        {
            HasConflict = conflicts.Count > 0,
            Conflicts = conflicts
        };
    }

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
