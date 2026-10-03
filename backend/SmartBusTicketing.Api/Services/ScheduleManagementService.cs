using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public interface IScheduleManagementService
{
    // SCRUM-44 - Quản lý lịch trình
    Task<IReadOnlyList<ScheduleDto>> GetSchedulesAsync(long? routeId, CancellationToken ct);
    Task<ScheduleDto?> GetScheduleAsync(long id, CancellationToken ct);
    Task<ServiceResult<ScheduleDto>> CreateScheduleAsync(ScheduleRequest request, CancellationToken ct);
    Task<ServiceResult<ScheduleDto>> UpdateScheduleAsync(long id, ScheduleRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteScheduleAsync(long id, CancellationToken ct);

    // SCRUM-45 - Sinh chuyến xe từ lịch trình
    Task<ServiceResult<GenerateTripsResult>> GenerateTripsAsync(long id, GenerateTripsRequest request, CancellationToken ct);
    Task<ServiceResult<IReadOnlyList<ScheduleTripDto>>> GetTripsAsync(long id, DateOnly? from, DateOnly? to, CancellationToken ct);
}

/// <summary>
/// SCRUM-44: CRUD lịch trình (giờ đầu, giờ cuối, tần suất, ngày chạy trong tuần) theo tuyến.
/// SCRUM-45: sinh danh sách chuyến theo tần suất từ một lịch trình, bỏ qua chuyến đã tồn tại.
///
/// Giờ trong lịch trình là giờ Việt Nam (UTC+7). Cột trips.DepartureAt lưu UTC như phần còn lại
/// của hệ thống (xem backend/README.md), nên khi sinh chuyến phải đổi từ giờ Việt Nam sang UTC.
/// Việt Nam không dùng giờ mùa hè nên dùng độ lệch cố định, không phụ thuộc tzdata của máy chủ.
/// </summary>
public sealed class ScheduleManagementService(AppDbContext db) : IScheduleManagementService
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>Số ngày tối đa cho một lần sinh chuyến, để không tạo hàng chục nghìn bản ghi một lúc.</summary>
    private const int MaxGenerateDays = 31;

    private const int MaxListDays = 62;
    private const int MaxListTrips = 1000;

    /// <summary>Thứ tự tuần bắt đầu từ thứ Hai, khớp cột days_of_week trong schema.sql.</summary>
    private static readonly string[] DayCodes = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

    private static readonly string[] TimeFormats = ["HH:mm", "HH:mm:ss"];

    private static string CodeOf(DayOfWeek day) => DayCodes[((int)day + 6) % 7];

    private static DateOnly TodayInVietnam() => DateOnly.FromDateTime(DateTime.UtcNow + VietnamOffset);

    private static DateTime ToUtc(DateOnly date, TimeOnly time) =>
        DateTime.SpecifyKind(date.ToDateTime(time) - VietnamOffset, DateTimeKind.Utc);

    private static string FormatTime(TimeOnly time) => time.ToString("HH:mm", CultureInfo.InvariantCulture);

    private static int TripsPerDayOf(TimeOnly first, TimeOnly last, int frequencyMinutes) =>
        frequencyMinutes <= 0 ? 0 : (int)((last.ToTimeSpan() - first.ToTimeSpan()).TotalMinutes / frequencyMinutes) + 1;

    private static IReadOnlyList<string> ParseStoredDays(string stored) =>
        DayCodes.Where(code => stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(code, StringComparer.OrdinalIgnoreCase)).ToList();

    private static bool TryParseTime(string? value, out TimeOnly time)
    {
        time = default;
        if (!TimeOnly.TryParseExact(value?.Trim(), TimeFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            return false;
        time = new TimeOnly(parsed.Hour, parsed.Minute); // bỏ phần giây
        return true;
    }

    private sealed class ScheduleRow
    {
        public long Id { get; init; }
        public long RouteId { get; init; }
        public string RouteCode { get; init; } = string.Empty;
        public string RouteName { get; init; } = string.Empty;
        public TimeOnly FirstDeparture { get; init; }
        public TimeOnly LastDeparture { get; init; }
        public int FrequencyMinutes { get; init; }
        public string DaysOfWeek { get; init; } = string.Empty;
        public int TripCount { get; init; }
    }

    private static ScheduleDto ToDto(ScheduleRow r) => new()
    {
        Id = r.Id,
        RouteId = r.RouteId,
        RouteCode = r.RouteCode,
        RouteName = r.RouteName,
        FirstDeparture = FormatTime(r.FirstDeparture),
        LastDeparture = FormatTime(r.LastDeparture),
        FrequencyMinutes = r.FrequencyMinutes,
        DaysOfWeek = ParseStoredDays(r.DaysOfWeek),
        TripsPerDay = TripsPerDayOf(r.FirstDeparture, r.LastDeparture, r.FrequencyMinutes),
        GeneratedTripCount = r.TripCount
    };

    private IQueryable<ScheduleRow> Rows() => db.Schedules.AsNoTracking().Select(s => new ScheduleRow
    {
        Id = s.Id,
        RouteId = s.RouteId,
        RouteCode = s.BusRoute.Code,
        RouteName = s.BusRoute.Name,
        FirstDeparture = s.FirstDeparture,
        LastDeparture = s.LastDeparture,
        FrequencyMinutes = s.FrequencyMinutes,
        DaysOfWeek = s.DaysOfWeek,
        TripCount = s.Trips.Count
    });

    // ===================== SCRUM-44: Quản lý lịch trình =====================

    public async Task<IReadOnlyList<ScheduleDto>> GetSchedulesAsync(long? routeId, CancellationToken ct)
    {
        var query = Rows();
        if (routeId.HasValue) query = query.Where(r => r.RouteId == routeId.Value);

        var rows = await query.OrderBy(r => r.RouteCode).ThenBy(r => r.FirstDeparture).ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<ScheduleDto?> GetScheduleAsync(long id, CancellationToken ct)
    {
        var row = await Rows().Where(r => r.Id == id).SingleOrDefaultAsync(ct);
        return row is null ? null : ToDto(row);
    }

    /// <summary>Kiểm tra và chuẩn hóa dữ liệu nhập. Trả lỗi nghiệp vụ hoặc giá trị đã chuẩn hóa.</summary>
    private static (string? Error, TimeOnly First, TimeOnly Last, string Days) Validate(ScheduleRequest request)
    {
        if (!TryParseTime(request.FirstDeparture, out var first))
            return ("Giờ chuyến đầu không hợp lệ, cần dạng HH:mm.", default, default, "");
        if (!TryParseTime(request.LastDeparture, out var last))
            return ("Giờ chuyến cuối không hợp lệ, cần dạng HH:mm.", default, default, "");
        if (last < first)
            return ("Giờ chuyến cuối phải sau hoặc bằng giờ chuyến đầu.", default, default, "");

        var requested = request.DaysOfWeek.Select(d => d.Trim().ToUpperInvariant()).ToList();
        var unknown = requested.FirstOrDefault(d => !DayCodes.Contains(d));
        if (unknown is not null)
            return ($"Ngày '{unknown}' không hợp lệ. Dùng MON, TUE, WED, THU, FRI, SAT, SUN.", default, default, "");

        var days = DayCodes.Where(requested.Contains).ToList();
        if (days.Count == 0)
            return ("Chọn ít nhất một ngày chạy trong tuần.", default, default, "");

        return (null, first, last, string.Join(',', days));
    }

    /// <summary>
    /// Hai lịch trình của cùng một tuyến không được trùng cả ngày chạy lẫn khung giờ, nếu không
    /// khi sinh chuyến sẽ ra hai chuyến cùng tuyến chồng lên nhau.
    /// </summary>
    private async Task<string?> FindOverlapAsync(long routeId, long? excludeId, TimeOnly first, TimeOnly last,
        string days, CancellationToken ct)
    {
        var mine = days.Split(',').ToHashSet();
        var others = await db.Schedules.AsNoTracking()
            .Where(s => s.RouteId == routeId && (excludeId == null || s.Id != excludeId.Value))
            .ToListAsync(ct);

        foreach (var other in others)
        {
            var sameDay = ParseStoredDays(other.DaysOfWeek).Any(mine.Contains);
            var overlapTime = first <= other.LastDeparture && other.FirstDeparture <= last;
            if (sameDay && overlapTime)
                return $"Trùng với lịch trình #{other.Id} của tuyến này ({FormatTime(other.FirstDeparture)} - {FormatTime(other.LastDeparture)}) " +
                       "vào cùng ngày trong tuần. Hãy sửa lịch trình đó hoặc chọn khung giờ / ngày khác.";
        }
        return null;
    }

    public async Task<ServiceResult<ScheduleDto>> CreateScheduleAsync(ScheduleRequest request, CancellationToken ct)
    {
        var (error, first, last, days) = Validate(request);
        if (error is not null) return ServiceResult<ScheduleDto>.Fail(ServiceError.Invalid, error);

        var route = await db.BusRoutes.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RouteId, ct);
        if (route is null) return ServiceResult<ScheduleDto>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");
        if (!route.Active)
            return ServiceResult<ScheduleDto>.Fail(ServiceError.Invalid, "Tuyến đang ngừng hoạt động nên không thể lập lịch trình.");

        var overlap = await FindOverlapAsync(route.Id, null, first, last, days, ct);
        if (overlap is not null) return ServiceResult<ScheduleDto>.Fail(ServiceError.Conflict, overlap);

        var schedule = new Schedule
        {
            RouteId = route.Id,
            FirstDeparture = first,
            LastDeparture = last,
            FrequencyMinutes = request.FrequencyMinutes,
            DaysOfWeek = days
        };
        db.Schedules.Add(schedule);
        await db.SaveChangesAsync(ct);
        return ServiceResult<ScheduleDto>.Success((await GetScheduleAsync(schedule.Id, ct))!);
    }

    public async Task<ServiceResult<ScheduleDto>> UpdateScheduleAsync(long id, ScheduleRequest request, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return ServiceResult<ScheduleDto>.Fail(ServiceError.NotFound, "Không tìm thấy lịch trình.");

        var (error, first, last, days) = Validate(request);
        if (error is not null) return ServiceResult<ScheduleDto>.Fail(ServiceError.Invalid, error);

        var route = await db.BusRoutes.AsNoTracking().SingleOrDefaultAsync(r => r.Id == request.RouteId, ct);
        if (route is null) return ServiceResult<ScheduleDto>.Fail(ServiceError.NotFound, "Không tìm thấy tuyến đường.");

        // Đổi sang tuyến khác khi lịch trình đã sinh chuyến sẽ làm chuyến cũ mang sai tuyến.
        if (route.Id != schedule.RouteId && await db.Trips.AnyAsync(t => t.ScheduleId == id, ct))
            return ServiceResult<ScheduleDto>.Fail(ServiceError.Conflict,
                "Lịch trình đã sinh chuyến nên không thể đổi sang tuyến khác. Hãy tạo lịch trình mới cho tuyến đó.");
        if (!route.Active && route.Id != schedule.RouteId)
            return ServiceResult<ScheduleDto>.Fail(ServiceError.Invalid, "Tuyến đang ngừng hoạt động nên không thể lập lịch trình.");

        var overlap = await FindOverlapAsync(route.Id, id, first, last, days, ct);
        if (overlap is not null) return ServiceResult<ScheduleDto>.Fail(ServiceError.Conflict, overlap);

        // Chuyến đã sinh không bị đổi theo; chỉ các lần sinh sau mới dùng giờ và tần suất mới.
        schedule.RouteId = route.Id;
        schedule.FirstDeparture = first;
        schedule.LastDeparture = last;
        schedule.FrequencyMinutes = request.FrequencyMinutes;
        schedule.DaysOfWeek = days;
        await db.SaveChangesAsync(ct);
        return ServiceResult<ScheduleDto>.Success((await GetScheduleAsync(id, ct))!);
    }

    public async Task<ServiceResult<bool>> DeleteScheduleAsync(long id, CancellationToken ct)
    {
        var schedule = await db.Schedules.FindAsync([id], ct);
        if (schedule is null) return ServiceResult<bool>.Fail(ServiceError.NotFound, "Không tìm thấy lịch trình.");

        // Chuyến đã có người đặt vé hoặc đã phân công nhân sự thì giữ nguyên để không mất dữ liệu vận hành.
        var inUse = await db.Trips.AnyAsync(t => t.ScheduleId == id && (t.Bookings.Any() || t.TripStaff.Any()), ct);
        if (inUse)
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                "Lịch trình có chuyến đã được đặt vé hoặc phân công nên không thể xóa.");

        // Xóa các chuyến sắp chạy chưa ai đặt. Chuyến đã chạy hoặc đã hủy được giữ lại, ScheduleId chuyển về null.
        var nowUtc = DateTime.UtcNow;
        var upcoming = await db.Trips
            .Where(t => t.ScheduleId == id && t.Status == TripStatus.Scheduled && t.DepartureAt > nowUtc)
            .ToListAsync(ct);
        db.Trips.RemoveRange(upcoming);
        db.Schedules.Remove(schedule);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }

    // ===================== SCRUM-45: Sinh chuyến từ lịch trình =====================

    public async Task<ServiceResult<GenerateTripsResult>> GenerateTripsAsync(long id, GenerateTripsRequest request, CancellationToken ct)
    {
        var schedule = await db.Schedules.AsNoTracking().Include(s => s.BusRoute).SingleOrDefaultAsync(s => s.Id == id, ct);
        if (schedule is null) return ServiceResult<GenerateTripsResult>.Fail(ServiceError.NotFound, "Không tìm thấy lịch trình.");
        if (!schedule.BusRoute.Active)
            return ServiceResult<GenerateTripsResult>.Fail(ServiceError.Invalid, "Tuyến đang ngừng hoạt động nên không thể sinh chuyến.");

        if (request.ToDate < request.FromDate)
            return ServiceResult<GenerateTripsResult>.Fail(ServiceError.Invalid, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        if (request.FromDate < TodayInVietnam())
            return ServiceResult<GenerateTripsResult>.Fail(ServiceError.Invalid, "Không thể sinh chuyến cho ngày đã qua.");
        if (request.ToDate.DayNumber - request.FromDate.DayNumber + 1 > MaxGenerateDays)
            return ServiceResult<GenerateTripsResult>.Fail(ServiceError.Invalid, $"Chỉ sinh tối đa {MaxGenerateDays} ngày mỗi lần.");

        var runDays = ParseStoredDays(schedule.DaysOfWeek).ToHashSet();
        var times = new List<TimeOnly>();
        for (var t = schedule.FirstDeparture; t <= schedule.LastDeparture; t = t.AddMinutes(schedule.FrequencyMinutes))
        {
            times.Add(t);
            // AddMinutes quay vòng qua nửa đêm; dừng nếu mốc kế tiếp nhỏ hơn mốc hiện tại.
            if (t.AddMinutes(schedule.FrequencyMinutes) <= t) break;
        }

        var candidates = new List<DateTime>();
        for (var date = request.FromDate; date <= request.ToDate; date = date.AddDays(1))
        {
            if (!runDays.Contains(CodeOf(date.DayOfWeek))) continue;
            foreach (var time in times) candidates.Add(ToUtc(date, time));
        }

        if (candidates.Count == 0)
            return ServiceResult<GenerateTripsResult>.Fail(ServiceError.Invalid,
                "Khoảng ngày đã chọn không có ngày nào nằm trong các ngày chạy của lịch trình.");

        var nowUtc = DateTime.UtcNow;
        var skippedPast = candidates.Count(c => c <= nowUtc);
        candidates = candidates.Where(c => c > nowUtc).OrderBy(c => c).ToList();

        var existing = new HashSet<DateTime>();
        if (candidates.Count > 0)
        {
            var min = candidates[0];
            var max = candidates[^1];
            var found = await db.Trips.AsNoTracking()
                .Where(t => t.ScheduleId == id && t.DepartureAt >= min && t.DepartureAt <= max)
                .Select(t => t.DepartureAt)
                .ToListAsync(ct);
            existing = found.ToHashSet();
        }

        var toCreate = candidates.Where(c => !existing.Contains(c)).ToList();

        if (!request.DryRun && toCreate.Count > 0)
        {
            db.Trips.AddRange(toCreate.Select(departure => new Trip
            {
                RouteId = schedule.RouteId,
                ScheduleId = schedule.Id,
                DepartureAt = departure,
                Status = TripStatus.Scheduled
            }));
            await db.SaveChangesAsync(ct);
        }

        return ServiceResult<GenerateTripsResult>.Success(new GenerateTripsResult
        {
            DryRun = request.DryRun,
            Created = toCreate.Count,
            Skipped = candidates.Count - toCreate.Count,
            SkippedPast = skippedPast,
            Departures = toCreate
        });
    }

    public async Task<ServiceResult<IReadOnlyList<ScheduleTripDto>>> GetTripsAsync(long id, DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        if (!await db.Schedules.AnyAsync(s => s.Id == id, ct))
            return ServiceResult<IReadOnlyList<ScheduleTripDto>>.Fail(ServiceError.NotFound, "Không tìm thấy lịch trình.");

        var start = from ?? TodayInVietnam();
        var end = to ?? start.AddDays(13);
        if (end < start)
            return ServiceResult<IReadOnlyList<ScheduleTripDto>>.Fail(ServiceError.Invalid, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        if (end.DayNumber - start.DayNumber + 1 > MaxListDays)
            return ServiceResult<IReadOnlyList<ScheduleTripDto>>.Fail(ServiceError.Invalid, $"Chỉ xem tối đa {MaxListDays} ngày mỗi lần.");

        var fromUtc = ToUtc(start, TimeOnly.MinValue);
        var toUtc = ToUtc(end.AddDays(1), TimeOnly.MinValue);

        var trips = await db.Trips.AsNoTracking()
            .Where(t => t.ScheduleId == id && t.DepartureAt >= fromUtc && t.DepartureAt < toUtc)
            .OrderBy(t => t.DepartureAt)
            .Take(MaxListTrips)
            .Select(t => new ScheduleTripDto
            {
                Id = t.Id,
                ScheduleId = id,
                DepartureAt = t.DepartureAt,
                Status = t.Status,
                BusId = t.BusId,
                PlateNumber = t.Bus != null ? t.Bus.PlateNumber : null
            })
            .ToListAsync(ct);

        return ServiceResult<IReadOnlyList<ScheduleTripDto>>.Success(trips);
    }
}
