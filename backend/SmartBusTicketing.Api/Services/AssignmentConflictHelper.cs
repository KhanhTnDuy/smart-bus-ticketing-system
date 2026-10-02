using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

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
            // Fallback theo tên ca trực chuẩn
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
    /// Kiểm tra xung đột lịch trình: Chặn gán một xe hoặc một tài xế vào hai ca/chuyến có thời gian chồng nhau.
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
        long? excludeId = null,
        CancellationToken ct = default)
    {
        var cleanBusPlate = busPlate?.Trim();
        var cleanDriverId = driverId?.Trim();
        var cleanDriverName = driverName?.Trim();
        var cleanAssistantId = assistantId?.Trim();
        var cleanAssistantName = assistantName?.Trim();

        // 1. Kiểm tra với các bản ghi BusAssignment khác đang hoạt động
        var searchDateMin = DateOnly.FromDateTime(candidateStart.AddDays(-1));
        var searchDateMax = DateOnly.FromDateTime(candidateEnd.AddDays(1));

        var existingAssignments = await db.BusAssignments
            .AsNoTracking()
            .Include(a => a.Route)
            .Where(a => a.Status != "CANCELLED"
                     && (excludeId == null || a.Id != excludeId.Value)
                     && a.Date >= searchDateMin
                     && a.Date <= searchDateMax)
            .ToListAsync(ct);

        foreach (var other in existingAssignments)
        {
            if (!HasOverlap(candidateStart, candidateEnd, other.StartTime, other.EndTime))
            {
                continue;
            }

            var routeLabel = other.Route?.Code ?? other.RouteId.ToString();
            var timeRangeLabel = $"{other.StartTime:HH:mm} — {other.EndTime:HH:mm} ngày {other.Date:dd/MM/yyyy}";

            // 1.1 Kiểm tra trùng xe buýt
            if (!string.IsNullOrWhiteSpace(cleanBusPlate) &&
                string.Equals(other.BusPlate.Trim(), cleanBusPlate, StringComparison.OrdinalIgnoreCase))
            {
                return new ConflictCheckResult
                {
                    HasConflict = true,
                    ConflictType = "BUS",
                    ConflictingAssignmentCode = other.AssignmentCode,
                    Message = $"Phương tiện {cleanBusPlate} đã được phân công cho ca [{other.AssignmentCode}] ({timeRangeLabel} - Tuyến {routeLabel}). Không thể gán xe trùng giờ!"
                };
            }

            // 1.2 Kiểm tra trùng tài xế
            var isSameDriver = (!string.IsNullOrWhiteSpace(cleanDriverId) && string.Equals(other.DriverId.Trim(), cleanDriverId, StringComparison.OrdinalIgnoreCase))
                || (!string.IsNullOrWhiteSpace(cleanDriverName) && string.Equals(other.DriverName.Trim(), cleanDriverName, StringComparison.OrdinalIgnoreCase));

            if (isSameDriver)
            {
                var displayName = !string.IsNullOrWhiteSpace(cleanDriverName) ? cleanDriverName : cleanDriverId;
                return new ConflictCheckResult
                {
                    HasConflict = true,
                    ConflictType = "DRIVER",
                    ConflictingAssignmentCode = other.AssignmentCode,
                    Message = $"Tài xế {displayName} đã có lịch phân công cho ca [{other.AssignmentCode}] ({timeRangeLabel} - Tuyến {routeLabel}). Không thể gán tài xế trùng giờ!"
                };
            }

            // 1.3 Kiểm tra trùng phụ xe (nếu có)
            if (!string.IsNullOrWhiteSpace(cleanAssistantName) &&
                !string.IsNullOrWhiteSpace(other.AssistantName) &&
                string.Equals(other.AssistantName.Trim(), cleanAssistantName, StringComparison.OrdinalIgnoreCase))
            {
                return new ConflictCheckResult
                {
                    HasConflict = true,
                    ConflictType = "ASSISTANT",
                    ConflictingAssignmentCode = other.AssignmentCode,
                    Message = $"Nhân viên phụ xe {cleanAssistantName} đã có lịch phân công cho ca [{other.AssignmentCode}] ({timeRangeLabel}). Không thể gán trùng giờ!"
                };
            }
        }

        // 2. Kiểm tra chéo với bảng Trips trong CSDL (nếu hệ thống đã phát sinh chuyến xe)
        try
        {
            var trips = await db.Trips
                .AsNoTracking()
                .Include(t => t.Bus)
                .Include(t => t.TripStaff).ThenInclude(ts => ts.Account)
                .Where(t => t.Status != TripStatus.Cancelled
                         && t.DepartureAt >= candidateStart.AddHours(-6)
                         && t.DepartureAt <= candidateEnd.AddHours(2))
                .ToListAsync(ct);

            foreach (var trip in trips)
            {
                var tripStart = trip.DepartureAt;
                var tripEnd = trip.DepartureAt.AddMinutes(90); // ước tính 90 phút một lượt chuyến

                if (!HasOverlap(candidateStart, candidateEnd, tripStart, tripEnd))
                {
                    continue;
                }

                // Trùng xe trên chuyến
                if (!string.IsNullOrWhiteSpace(cleanBusPlate) &&
                    trip.Bus != null &&
                    string.Equals(trip.Bus.PlateNumber.Trim(), cleanBusPlate, StringComparison.OrdinalIgnoreCase))
                {
                    return new ConflictCheckResult
                    {
                        HasConflict = true,
                        ConflictType = "TRIP_BUS",
                        Message = $"Phương tiện {cleanBusPlate} đã được xếp cho chuyến xe #{trip.Id} khởi hành lúc {trip.DepartureAt:HH:mm dd/MM/yyyy}. Trùng giờ vận hành!"
                    };
                }

                // Trùng tài xế trên chuyến
                var staffDriver = trip.TripStaff.FirstOrDefault(s => s.Duty == StaffDuty.Driver);
                if (staffDriver != null)
                {
                    var isStaffMatch = (!string.IsNullOrWhiteSpace(cleanDriverId) && staffDriver.AccountId.ToString() == cleanDriverId)
                        || (!string.IsNullOrWhiteSpace(cleanDriverName) && staffDriver.Account?.FullName == cleanDriverName);

                    if (isStaffMatch)
                    {
                        return new ConflictCheckResult
                        {
                            HasConflict = true,
                            ConflictType = "TRIP_DRIVER",
                            Message = $"Tài xế {cleanDriverName ?? cleanDriverId} đã được xếp lái chuyến xe #{trip.Id} khởi hành lúc {trip.DepartureAt:HH:mm dd/MM/yyyy}. Trùng giờ chuyến!"
                        };
                    }
                }
            }
        }
        catch
        {
            // Bỏ qua nếu bảng trips chưa có dữ liệu hoặc quan hệ chưa kết nối
        }

        return new ConflictCheckResult { HasConflict = false };
    }
}
