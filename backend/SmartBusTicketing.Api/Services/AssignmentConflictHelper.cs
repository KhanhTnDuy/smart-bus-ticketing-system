using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// SCRUM-51: Kiểm tra xung đột lịch trình: Chặn gán một xe hoặc một tài xế/phụ xe
/// vào hai chuyến chạy (Trips) có thời gian chồng nhau.
/// </summary>
public static class AssignmentConflictHelper
{
    private static readonly Regex ShiftHoursRegex = new(
        @"(\d{1,2}:\d{2})\s*[-—–~to]+\s*(\d{1,2}:\d{2})",
        RegexOptions.Compiled);

    /// <summary>
    /// Tính toán StartTime và EndTime từ Date (YYYY-MM-DD) và ShiftHours / Shift.
    /// </summary>
    public static (DateTime StartTime, DateTime EndTime) ParseTimeRange(string dateStr, string shiftHours, string shift)
    {
        if (!DateOnly.TryParse(dateStr, out var date))
        {
            date = DateOnly.FromDateTime(DateTime.UtcNow);
        }

        TimeOnly t1;
        TimeOnly t2;

        var match = ShiftHoursRegex.Match(shiftHours ?? string.Empty);
        if (match.Success &&
            TimeOnly.TryParse(match.Groups[1].Value, out var parsedT1) &&
            TimeOnly.TryParse(match.Groups[2].Value, out var parsedT2))
        {
            t1 = parsedT1;
            t2 = parsedT2;
        }
        else
        {
            switch (shift?.ToUpperInvariant())
            {
                case "CA_SANG":
                    t1 = new TimeOnly(5, 30);
                    t2 = new TimeOnly(13, 30);
                    break;
                case "CA_CHIEU":
                    t1 = new TimeOnly(13, 30);
                    t2 = new TimeOnly(21, 30);
                    break;
                case "CA_TOI":
                    t1 = new TimeOnly(18, 0);
                    t2 = new TimeOnly(23, 0);
                    break;
                case "TOAN_THOI_GIAN":
                    t1 = new TimeOnly(5, 30);
                    t2 = new TimeOnly(21, 30);
                    break;
                default:
                    t1 = new TimeOnly(6, 0);
                    t2 = new TimeOnly(18, 0);
                    break;
            }
        }

        var start = date.ToDateTime(t1);
        var end = t2 <= t1 ? date.AddDays(1).ToDateTime(t2) : date.ToDateTime(t2);

        return (start, end);
    }

    /// <summary>
    /// Hai khoảng thời gian [startA, endA) và [startB, endB) chồng nhau khi và chỉ khi:
    /// startA &lt; endB VÀ startB &lt; endA.
    /// Hai ca giáp mí nhau (VD: Ca 1 kết thúc 13:30, Ca 2 bắt đầu 13:30) KHÔNG bị tính là trùng.
    /// </summary>
    public static bool HasOverlap(DateTime startA, DateTime endA, DateTime startB, DateTime endB)
    {
        return startA < endB && startB < endA;
    }

    /// <summary>
    /// Kiểm tra xung đột lịch chạy trên thực thể Trips (SCRUM-50 &amp; SCRUM-51).
    /// Ưu tiên so trùng theo ID phương tiện (BusId) và ID tài khoản (AccountId/DriverId),
    /// không so sánh mù quáng theo chuỗi tên để tránh chặn nhầm người trùng tên.
    /// </summary>
    public static async Task<ConflictCheckResult> CheckTripConflictAsync(
        AppDbContext db,
        long? targetBusId,
        string? targetBusPlate,
        long? targetDriverId,
        long? targetAssistantId,
        DateTime candidateStart,
        DateTime candidateEnd,
        long? excludeTripId = null,
        ILogger? logger = null,
        CancellationToken ct = default)
    {
        // 1. Xác định BusId nếu chỉ có biển số xe
        if (!targetBusId.HasValue && !string.IsNullOrWhiteSpace(targetBusPlate))
        {
            var cleanPlate = targetBusPlate.Trim().ToUpperInvariant();
            var matchedBus = await db.Buses.AsNoTracking()
                .FirstOrDefaultAsync(b => b.PlateNumber == cleanPlate, ct);
            if (matchedBus != null)
            {
                targetBusId = matchedBus.Id;
            }
        }

        try
        {
            // 2. Tìm kiếm các chuyến xe (Trips) chưa bị hủy có khoảng thời gian chạy giao cắt
            var searchStart = candidateStart.AddHours(-14);
            var searchEnd = candidateEnd.AddHours(14);

            var query = db.Trips
                .AsNoTracking()
                .Include(t => t.BusRoute).ThenInclude(r => r.RouteStops)
                .Include(t => t.Bus)
                .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
                .Where(t => t.Status != TripStatus.Cancelled
                         && t.DepartureAt >= searchStart
                         && t.DepartureAt <= searchEnd);

            if (excludeTripId.HasValue)
            {
                query = query.Where(t => t.Id != excludeTripId.Value);
            }

            var otherTrips = await query.ToListAsync(ct);

            foreach (var other in otherTrips)
            {
                // Ước tính thời gian hành trình chuyến đi dựa theo trạm cuối của tuyến (hoặc 60 phút)
                var durationMinutes = 60;
                if (other.BusRoute?.RouteStops != null && other.BusRoute.RouteStops.Count > 0)
                {
                    var maxMinutes = other.BusRoute.RouteStops.Max(rs => rs.MinutesFromStart);
                    if (maxMinutes > 0) durationMinutes = maxMinutes;
                }

                var otherStart = other.DepartureAt;
                var otherEnd = otherStart.AddMinutes(durationMinutes);

                if (!HasOverlap(candidateStart, candidateEnd, otherStart, otherEnd))
                {
                    continue;
                }

                var otherRouteLabel = other.BusRoute?.Code ?? other.RouteId.ToString();
                var timeRangeLabel = $"{otherStart:HH:mm} — {otherEnd:HH:mm} ngày {otherStart:dd/MM/yyyy}";

                // 2.1 Kiểm tra trùng phương tiện THEO ID (BusId)
                if (targetBusId.HasValue && other.BusId.HasValue && targetBusId.Value == other.BusId.Value)
                {
                    var plate = other.Bus?.PlateNumber ?? targetBusPlate ?? $"#{targetBusId.Value}";
                    return new ConflictCheckResult
                    {
                        HasConflict = true,
                        ConflictType = "BUS",
                        ConflictingAssignmentCode = $"TRIP-{other.Id}",
                        Message = $"Phương tiện {plate} (ID: {targetBusId.Value}) đã được phân công cho chuyến xe #{other.Id} ({timeRangeLabel} - Tuyến {otherRouteLabel}). Trùng lịch vận hành!"
                    };
                }

                // Nếu có biển số xe nhưng chưa có BusId thì so theo biển số chuẩn hóa
                if (!targetBusId.HasValue && !string.IsNullOrWhiteSpace(targetBusPlate) && other.Bus != null &&
                    string.Equals(other.Bus.PlateNumber.Trim(), targetBusPlate.Trim(), StringComparison.OrdinalIgnoreCase))
                {
                    return new ConflictCheckResult
                    {
                        HasConflict = true,
                        ConflictType = "BUS",
                        ConflictingAssignmentCode = $"TRIP-{other.Id}",
                        Message = $"Phương tiện {targetBusPlate.Trim()} đã được phân công cho chuyến xe #{other.Id} ({timeRangeLabel} - Tuyến {otherRouteLabel}). Trùng lịch vận hành!"
                    };
                }

                // 2.2 Kiểm tra trùng tài xế THEO ID (AccountId)
                if (targetDriverId.HasValue)
                {
                    var otherDriver = other.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver && ts.AccountId == targetDriverId.Value);
                    if (otherDriver != null)
                    {
                        var driverName = otherDriver.Account?.FullName ?? $"ID #{targetDriverId.Value}";
                        return new ConflictCheckResult
                        {
                            HasConflict = true,
                            ConflictType = "DRIVER",
                            ConflictingAssignmentCode = $"TRIP-{other.Id}",
                            Message = $"Tài xế {driverName} (Mã NV: {targetDriverId.Value}) đã có lịch lái chuyến xe #{other.Id} ({timeRangeLabel} - Tuyến {otherRouteLabel}). Trùng lịch làm việc!"
                        };
                    }
                }

                // 2.3 Kiểm tra trùng phụ xe THEO ID (AccountId)
                if (targetAssistantId.HasValue)
                {
                    var otherAssistant = other.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor && ts.AccountId == targetAssistantId.Value);
                    if (otherAssistant != null)
                    {
                        var assistantName = otherAssistant.Account?.FullName ?? $"ID #{targetAssistantId.Value}";
                        return new ConflictCheckResult
                        {
                            HasConflict = true,
                            ConflictType = "ASSISTANT",
                            ConflictingAssignmentCode = $"TRIP-{other.Id}",
                            Message = $"Nhân viên phụ xe {assistantName} (Mã NV: {targetAssistantId.Value}) đã có lịch làm việc chuyến xe #{other.Id} ({timeRangeLabel}). Trùng lịch làm việc!"
                        };
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // Ghi log lỗi cơ sở dữ liệu rõ ràng, tuyệt đối không dùng catch {} rỗng
            logger?.LogError(ex, "Lỗi khi kiểm tra xung đột trùng lịch giữa các chuyến xe trong CSDL.");
            throw;
        }

        return new ConflictCheckResult { HasConflict = false };
    }

    /// <summary>
    /// Phương thức tiện ích tra cứu ID của Xe, Tài xế, Phụ xe trước khi kiểm tra trùng lịch.
    /// Giúp ưu tiên so trùng theo ID để tránh chặn nhầm người trùng tên.
    /// </summary>
    public static async Task<ConflictCheckResult> CheckConflictAsync(
        AppDbContext db,
        string? busPlate,
        string? driverId,
        string? driverName,
        string? assistantId,
        string? assistantName,
        DateTime candidateStart,
        DateTime candidateEnd,
        long? excludeTripId = null,
        ILogger? logger = null,
        CancellationToken ct = default)
    {
        long? targetBusId = null;
        if (!string.IsNullOrWhiteSpace(busPlate))
        {
            var clean = busPlate.Trim().ToUpperInvariant();
            var b = await db.Buses.AsNoTracking().FirstOrDefaultAsync(x => x.PlateNumber == clean, ct);
            if (b != null) targetBusId = b.Id;
        }

        long? targetDriverId = null;
        if (long.TryParse(driverId, out var parsedDrv))
        {
            targetDriverId = parsedDrv;
        }
        else if (!string.IsNullOrWhiteSpace(driverId))
        {
            var raw = driverId.Trim();
            if (raw.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(raw[4..], out var uId))
            {
                targetDriverId = uId;
            }
            if (!targetDriverId.HasValue)
            {
                var drvAcc = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Username == raw, ct);
                if (drvAcc != null) targetDriverId = drvAcc.Id;
            }
        }
        if (!targetDriverId.HasValue && !string.IsNullOrWhiteSpace(driverName))
        {
            var drvAcc = await db.Accounts.AsNoTracking()
                .FirstOrDefaultAsync(a => a.FullName == driverName.Trim() && a.Role == AccountRole.Driver, ct);
            if (drvAcc != null) targetDriverId = drvAcc.Id;
        }

        long? targetAssistantId = null;
        if (long.TryParse(assistantId, out var parsedAsst))
        {
            targetAssistantId = parsedAsst;
        }
        else if (!string.IsNullOrWhiteSpace(assistantId))
        {
            var raw = assistantId.Trim();
            if (raw.StartsWith("USR-", StringComparison.OrdinalIgnoreCase) && long.TryParse(raw[4..], out var uId))
            {
                targetAssistantId = uId;
            }
            if (!targetAssistantId.HasValue)
            {
                var asstAcc = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Username == raw, ct);
                if (asstAcc != null) targetAssistantId = asstAcc.Id;
            }
        }
        if (!targetAssistantId.HasValue && !string.IsNullOrWhiteSpace(assistantName))
        {
            var asstAcc = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.FullName == assistantName.Trim(), ct);
            if (asstAcc != null) targetAssistantId = asstAcc.Id;
        }

        return await CheckTripConflictAsync(
            db,
            targetBusId,
            busPlate,
            targetDriverId,
            targetAssistantId,
            candidateStart,
            candidateEnd,
            excludeTripId,
            logger,
            ct);
    }
}
