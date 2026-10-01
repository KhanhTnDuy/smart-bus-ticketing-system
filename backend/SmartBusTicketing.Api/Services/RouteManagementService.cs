using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>Kết quả thao tác: thành công hoặc lỗi nghiệp vụ (NotFound / Conflict / Invalid).</summary>
public sealed record ServiceResult<T>(T? Value, ServiceError Error = ServiceError.None, string? Message = null)
{
    public bool Ok => Error == ServiceError.None;
    public static ServiceResult<T> Success(T value) => new(value);
    public static ServiceResult<T> Fail(ServiceError error, string message) => new(default, error, message);
}

public enum ServiceError { None, NotFound, Conflict, Invalid }

public interface IRouteManagementService
{
    // Tuyến
    Task<PagedResponse<RouteDto>> GetRoutesAsync(string? search, bool? active, int page, int pageSize, CancellationToken ct);
    Task<RouteDto?> GetRouteAsync(long id, CancellationToken ct);
    Task<ServiceResult<RouteDto>> CreateRouteAsync(RouteRequest request, CancellationToken ct);
    Task<ServiceResult<RouteDto>> UpdateRouteAsync(long id, RouteRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteRouteAsync(long id, CancellationToken ct);

    // Trạm dừng
    Task<PagedResponse<StopDto>> GetStopsAsync(string? search, int page, int pageSize, CancellationToken ct);
    Task<StopDto?> GetStopAsync(long id, CancellationToken ct);
    Task<ServiceResult<StopDto>> CreateStopAsync(StopRequest request, CancellationToken ct);
    Task<ServiceResult<StopDto>> UpdateStopAsync(long id, StopRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteStopAsync(long id, CancellationToken ct);

    // Trạm theo tuyến
    Task<ServiceResult<IReadOnlyList<RouteStopDto>>> GetRouteStopsAsync(long routeId, CancellationToken ct);
    Task<ServiceResult<IReadOnlyList<RouteStopDto>>> ReplaceRouteStopsAsync(long routeId, ReplaceRouteStopsRequest request, CancellationToken ct);

    // Đối tượng hành khách
    Task<IReadOnlyList<PassengerTypeDto>> GetPassengerTypesAsync(CancellationToken ct);

    // Giá vé
    Task<IReadOnlyList<FareDto>> GetFaresAsync(long? routeId, CancellationToken ct);
    Task<ServiceResult<FareDto>> CreateFareAsync(FareRequest request, CancellationToken ct);
    Task<ServiceResult<FareDto>> UpdateFareAsync(long id, FareRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteFareAsync(long id, CancellationToken ct);
}

public sealed class RouteManagementService(AppDbContext db) : IRouteManagementService
{
    private static (int Page, int PageSize) Normalize(int page, int pageSize) => (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    // ===================== Tuyến đường =====================

    public async Task<PagedResponse<RouteDto>> GetRoutesAsync(string? search, bool? active, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Normalize(page, pageSize);
        var query = db.BusRoutes.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(r => r.Code.Contains(value) || r.Name.Contains(value)
                || r.StartPoint.Contains(value) || r.EndPoint.Contains(value));
        }
        if (active.HasValue) query = query.Where(r => r.Active == active.Value);

        var total = await query.CountAsync(ct);
        var data = await query.OrderBy(r => r.Code).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => new RouteDto
            {
                Id = r.Id, Code = r.Code, Name = r.Name, StartPoint = r.StartPoint, EndPoint = r.EndPoint,
                DistanceKm = r.DistanceKm, Active = r.Active, StopCount = r.RouteStops.Count
            }).ToListAsync(ct);

        return new PagedResponse<RouteDto> { Data = data, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<RouteDto?> GetRouteAsync(long id, CancellationToken ct) =>
        db.BusRoutes.AsNoTracking().Where(r => r.Id == id).Select(r => new RouteDto
        {
            Id = r.Id, Code = r.Code, Name = r.Name, StartPoint = r.StartPoint, EndPoint = r.EndPoint,
            DistanceKm = r.DistanceKm, Active = r.Active, StopCount = r.RouteStops.Count
        }).SingleOrDefaultAsync(ct);

    public async Task<ServiceResult<RouteDto>> CreateRouteAsync(RouteRequest request, CancellationToken ct)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.BusRoutes.AnyAsync(r => r.Code == code, ct))
            return ServiceResult<RouteDto>.Fail(ServiceError.Conflict, $"Mã tuyến '{code}' đã tồn tại.");

        var route = new BusRoute
        {
            Code = code, Name = request.Name.Trim(), StartPoint = request.StartPoint.Trim(),
            EndPoint = request.EndPoint.Trim(), DistanceKm = request.DistanceKm, Active = request.Active
        };
        db.BusRoutes.Add(route);
        await db.SaveChangesAsync(ct);
        return ServiceResult<RouteDto>.Success((await GetRouteAsync(route.Id, ct))!);
    }

    public async Task<ServiceResult<RouteDto>> UpdateRouteAsync(long id, RouteRequest request, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([id], ct);
        if (route is null) return ServiceResult<RouteDto>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");

        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.BusRoutes.AnyAsync(r => r.Code == code && r.Id != id, ct))
            return ServiceResult<RouteDto>.Fail(ServiceError.Conflict, $"Mã tuyến '{code}' đã tồn tại.");

        route.Code = code;
        route.Name = request.Name.Trim();
        route.StartPoint = request.StartPoint.Trim();
        route.EndPoint = request.EndPoint.Trim();
        route.DistanceKm = request.DistanceKm;
        route.Active = request.Active;
        await db.SaveChangesAsync(ct);
        return ServiceResult<RouteDto>.Success((await GetRouteAsync(id, ct))!);
    }

    public async Task<ServiceResult<bool>> DeleteRouteAsync(long id, CancellationToken ct)
    {
        var route = await db.BusRoutes.FindAsync([id], ct);
        if (route is null) return ServiceResult<bool>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");

        // Tuyến đã có chuyến / lịch / vé tháng thì không xóa cứng để không mất dữ liệu vận hành và doanh thu.
        var inUse = await db.Trips.AnyAsync(t => t.RouteId == id, ct)
            || await db.Schedules.AnyAsync(s => s.RouteId == id, ct)
            || await db.MonthlyPasses.AnyAsync(m => m.RouteId == id, ct);
        if (inUse)
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                "Tuyến đã có lịch trình/chuyến/vé tháng nên không thể xóa. Hãy chuyển sang trạng thái ngừng hoạt động.");

        db.BusRoutes.Remove(route); // route_stops và fares xóa theo (cascade)
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }

    // ===================== Trạm dừng =====================

    public async Task<PagedResponse<StopDto>> GetStopsAsync(string? search, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Normalize(page, pageSize);
        var query = db.Stops.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(s => s.Name.Contains(value));
        }

        var total = await query.CountAsync(ct);
        var data = await query.OrderBy(s => s.Name).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new StopDto { Id = s.Id, Name = s.Name, Latitude = s.Latitude, Longitude = s.Longitude })
            .ToListAsync(ct);
        return new PagedResponse<StopDto> { Data = data, Page = page, PageSize = pageSize, Total = total };
    }

    public Task<StopDto?> GetStopAsync(long id, CancellationToken ct) =>
        db.Stops.AsNoTracking().Where(s => s.Id == id)
            .Select(s => new StopDto { Id = s.Id, Name = s.Name, Latitude = s.Latitude, Longitude = s.Longitude })
            .SingleOrDefaultAsync(ct);

    public async Task<ServiceResult<StopDto>> CreateStopAsync(StopRequest request, CancellationToken ct)
    {
        var stop = new Stop { Name = request.Name.Trim(), Latitude = request.Latitude, Longitude = request.Longitude };
        db.Stops.Add(stop);
        await db.SaveChangesAsync(ct);
        return ServiceResult<StopDto>.Success((await GetStopAsync(stop.Id, ct))!);
    }

    public async Task<ServiceResult<StopDto>> UpdateStopAsync(long id, StopRequest request, CancellationToken ct)
    {
        var stop = await db.Stops.FindAsync([id], ct);
        if (stop is null) return ServiceResult<StopDto>.Fail(ServiceError.NotFound, "Không tìm thấy trạm dừng.");

        stop.Name = request.Name.Trim();
        stop.Latitude = request.Latitude;
        stop.Longitude = request.Longitude;
        await db.SaveChangesAsync(ct);
        return ServiceResult<StopDto>.Success((await GetStopAsync(id, ct))!);
    }

    public async Task<ServiceResult<bool>> DeleteStopAsync(long id, CancellationToken ct)
    {
        var stop = await db.Stops.FindAsync([id], ct);
        if (stop is null) return ServiceResult<bool>.Fail(ServiceError.NotFound, "Không tìm thấy trạm dừng.");

        if (await db.RouteStops.AnyAsync(rs => rs.StopId == id, ct))
            return ServiceResult<bool>.Fail(ServiceError.Conflict, "Trạm đang thuộc một tuyến. Hãy gỡ trạm khỏi tuyến trước khi xóa.");
        if (await db.Tickets.AnyAsync(t => t.BoardStopId == id || t.AlightStopId == id, ct))
            return ServiceResult<bool>.Fail(ServiceError.Conflict, "Trạm đã có vé phát hành nên không thể xóa.");

        db.Stops.Remove(stop);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }

    // ===================== Trạm theo tuyến =====================

    public async Task<ServiceResult<IReadOnlyList<RouteStopDto>>> GetRouteStopsAsync(long routeId, CancellationToken ct)
    {
        if (!await db.BusRoutes.AnyAsync(r => r.Id == routeId, ct))
            return ServiceResult<IReadOnlyList<RouteStopDto>>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");
        return ServiceResult<IReadOnlyList<RouteStopDto>>.Success(await LoadRouteStopsAsync(routeId, ct));
    }

    public async Task<ServiceResult<IReadOnlyList<RouteStopDto>>> ReplaceRouteStopsAsync(long routeId, ReplaceRouteStopsRequest request, CancellationToken ct)
    {
        if (!await db.BusRoutes.AnyAsync(r => r.Id == routeId, ct))
            return ServiceResult<IReadOnlyList<RouteStopDto>>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");

        var stopIds = request.Stops.Select(s => s.StopId).ToList();
        if (stopIds.Distinct().Count() != stopIds.Count)
            return ServiceResult<IReadOnlyList<RouteStopDto>>.Fail(ServiceError.Invalid, "Một trạm không thể xuất hiện hai lần trong cùng tuyến.");

        // Thời gian từ đầu tuyến phải không giảm theo thứ tự dừng.
        for (var i = 1; i < request.Stops.Count; i++)
            if (request.Stops[i].MinutesFromStart < request.Stops[i - 1].MinutesFromStart)
                return ServiceResult<IReadOnlyList<RouteStopDto>>.Fail(ServiceError.Invalid, "MinutesFromStart phải tăng dần theo thứ tự trạm.");

        var existing = await db.Stops.CountAsync(s => stopIds.Contains(s.Id), ct);
        if (existing != stopIds.Count)
            return ServiceResult<IReadOnlyList<RouteStopDto>>.Fail(ServiceError.Invalid, "Có trạm dừng không tồn tại.");

        // Xóa rồi thêm lại trong một transaction để tránh vướng unique index (route_id, stop_order).
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var old = await db.RouteStops.Where(rs => rs.RouteId == routeId).ToListAsync(ct);
        db.RouteStops.RemoveRange(old);
        await db.SaveChangesAsync(ct);

        db.RouteStops.AddRange(request.Stops.Select((s, i) => new RouteStop
        {
            RouteId = routeId, StopId = s.StopId, StopOrder = i + 1, MinutesFromStart = s.MinutesFromStart
        }));
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return ServiceResult<IReadOnlyList<RouteStopDto>>.Success(await LoadRouteStopsAsync(routeId, ct));
    }

    private async Task<IReadOnlyList<RouteStopDto>> LoadRouteStopsAsync(long routeId, CancellationToken ct) =>
        await db.RouteStops.AsNoTracking().Where(rs => rs.RouteId == routeId).OrderBy(rs => rs.StopOrder)
            .Select(rs => new RouteStopDto
            {
                StopId = rs.StopId, StopName = rs.Stop.Name, Latitude = rs.Stop.Latitude, Longitude = rs.Stop.Longitude,
                StopOrder = rs.StopOrder, MinutesFromStart = rs.MinutesFromStart
            }).ToListAsync(ct);

    // ===================== Đối tượng hành khách =====================

    public async Task<IReadOnlyList<PassengerTypeDto>> GetPassengerTypesAsync(CancellationToken ct) =>
        await db.PassengerTypes.AsNoTracking().OrderBy(p => p.Id)
            .Select(p => new PassengerTypeDto
            {
                Id = p.Id, Code = p.Code, Name = p.Name, DiscountPercent = p.DiscountPercent
            }).ToListAsync(ct);

    // ===================== Giá vé =====================

    public async Task<IReadOnlyList<FareDto>> GetFaresAsync(long? routeId, CancellationToken ct)
    {
        var query = db.Fares.AsNoTracking().AsQueryable();
        if (routeId.HasValue) query = query.Where(f => f.RouteId == routeId.Value);

        var fares = await query.Include(f => f.PassengerType).OrderBy(f => f.RouteId)
            .ThenBy(f => f.TicketType).ThenBy(f => f.PassengerTypeId).ThenByDescending(f => f.EffectiveFrom).ToListAsync(ct);

        var today = DateOnly.FromDateTime(DateTime.Today);
        // Trong mỗi nhóm (tuyến, loại vé, đối tượng) chỉ bản giá đã có hiệu lực gần nhất là ACTIVE.
        var activeIds = fares.Where(f => f.EffectiveFrom <= today)
            .GroupBy(f => (f.RouteId, f.TicketType, f.PassengerTypeId))
            .Select(g => g.OrderByDescending(f => f.EffectiveFrom).First().Id).ToHashSet();

        return fares.Select(f => ToDto(f, f.EffectiveFrom > today ? "UPCOMING" : activeIds.Contains(f.Id) ? "ACTIVE" : "EXPIRED")).ToList();
    }

    public async Task<ServiceResult<FareDto>> CreateFareAsync(FareRequest request, CancellationToken ct)
    {
        var invalid = await ValidateFareAsync(request, null, ct);
        if (invalid is not null) return invalid;

        var fare = new Fare
        {
            RouteId = request.RouteId, TicketType = Enum.Parse<TicketType>(request.TicketType, true),
            PassengerTypeId = request.PassengerTypeId, Price = request.Price, EffectiveFrom = request.EffectiveFrom
        };
        db.Fares.Add(fare);
        await db.SaveChangesAsync(ct);
        return ServiceResult<FareDto>.Success(await GetFareDtoAsync(fare.Id, ct));
    }

    public async Task<ServiceResult<FareDto>> UpdateFareAsync(long id, FareRequest request, CancellationToken ct)
    {
        var fare = await db.Fares.FindAsync([id], ct);
        if (fare is null) return ServiceResult<FareDto>.Fail(ServiceError.NotFound, "Không tìm thấy giá vé.");

        var invalid = await ValidateFareAsync(request, id, ct);
        if (invalid is not null) return invalid;

        fare.RouteId = request.RouteId;
        fare.TicketType = Enum.Parse<TicketType>(request.TicketType, true);
        fare.PassengerTypeId = request.PassengerTypeId;
        fare.Price = request.Price;
        fare.EffectiveFrom = request.EffectiveFrom;
        await db.SaveChangesAsync(ct);
        return ServiceResult<FareDto>.Success(await GetFareDtoAsync(id, ct));
    }

    public async Task<ServiceResult<bool>> DeleteFareAsync(long id, CancellationToken ct)
    {
        var fare = await db.Fares.FindAsync([id], ct);
        if (fare is null) return ServiceResult<bool>.Fail(ServiceError.NotFound, "Không tìm thấy giá vé.");
        db.Fares.Remove(fare);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }

    private async Task<ServiceResult<FareDto>?> ValidateFareAsync(FareRequest request, long? excludeId, CancellationToken ct)
    {
        if (!Enum.TryParse<TicketType>(request.TicketType, true, out var type))
            return ServiceResult<FareDto>.Fail(ServiceError.Invalid, "TicketType phải là Single hoặc Monthly.");
        if (!await db.BusRoutes.AnyAsync(r => r.Id == request.RouteId, ct))
            return ServiceResult<FareDto>.Fail(ServiceError.Invalid, "Tuyến đường không tồn tại.");
        if (!await db.PassengerTypes.AnyAsync(p => p.Id == request.PassengerTypeId, ct))
            return ServiceResult<FareDto>.Fail(ServiceError.Invalid, "Đối tượng hành khách không tồn tại.");
        if (await db.Fares.AnyAsync(f => f.RouteId == request.RouteId && f.TicketType == type
                && f.PassengerTypeId == request.PassengerTypeId && f.EffectiveFrom == request.EffectiveFrom
                && (excludeId == null || f.Id != excludeId), ct))
            return ServiceResult<FareDto>.Fail(ServiceError.Conflict, "Đã có giá vé cùng tuyến, loại vé, đối tượng và ngày áp dụng.");
        return null;
    }

    private async Task<FareDto> GetFareDtoAsync(long id, CancellationToken ct)
    {
        var fare = await db.Fares.AsNoTracking().Include(f => f.PassengerType).SingleAsync(f => f.Id == id, ct);
        var all = await GetFaresAsync(fare.RouteId, ct);
        return all.Single(f => f.Id == id);
    }

    private static FareDto ToDto(Fare f, string status) => new()
    {
        Id = f.Id, RouteId = f.RouteId, TicketType = f.TicketType.ToString(), PassengerTypeId = f.PassengerTypeId,
        PassengerTypeCode = f.PassengerType.Code, PassengerTypeName = f.PassengerType.Name,
        Price = f.Price, EffectiveFrom = f.EffectiveFrom, Status = status
    };
}
