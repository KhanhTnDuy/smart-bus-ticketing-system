using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

// ---------- SCRUM-44: Quản lý lịch trình (thời gian biểu theo tuyến) ----------

/// <summary>
/// Một lịch trình của tuyến: giờ chuyến đầu, giờ chuyến cuối, tần suất và các ngày chạy trong tuần.
/// Giờ là giờ địa phương Việt Nam (UTC+7), định dạng "HH:mm".
/// </summary>
public sealed class ScheduleDto
{
    public long Id { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string FirstDeparture { get; init; } = string.Empty;
    public string LastDeparture { get; init; } = string.Empty;
    public int FrequencyMinutes { get; init; }

    /// <summary>Mã ngày theo thứ tự tuần: MON, TUE, WED, THU, FRI, SAT, SUN.</summary>
    public IReadOnlyList<string> DaysOfWeek { get; init; } = [];

    /// <summary>Số chuyến mỗi ngày chạy, tính từ giờ đầu, giờ cuối và tần suất.</summary>
    public int TripsPerDay { get; init; }

    /// <summary>Số chuyến đã được sinh ra từ lịch trình này.</summary>
    public int GeneratedTripCount { get; init; }
}

public sealed class ScheduleRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn tuyến đường.")]
    public long RouteId { get; init; }

    [Required(ErrorMessage = "Vui lòng nhập giờ chuyến đầu.")]
    public string FirstDeparture { get; init; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập giờ chuyến cuối.")]
    public string LastDeparture { get; init; } = string.Empty;

    [Range(5, 240, ErrorMessage = "Tần suất phải từ 5 đến 240 phút.")]
    public int FrequencyMinutes { get; init; }

    [Required, MinLength(1, ErrorMessage = "Chọn ít nhất một ngày chạy trong tuần.")]
    public string[] DaysOfWeek { get; init; } = [];
}

// ---------- SCRUM-45: Sinh chuyến xe từ lịch trình ----------

public sealed class GenerateTripsRequest
{
    /// <summary>Ngày bắt đầu sinh chuyến (theo lịch Việt Nam), định dạng yyyy-MM-dd.</summary>
    public DateOnly FromDate { get; init; }

    /// <summary>Ngày kết thúc (gồm cả ngày này). Tối đa 31 ngày tính từ FromDate.</summary>
    public DateOnly ToDate { get; init; }

    /// <summary>true: chỉ tính trước danh sách chuyến sẽ sinh, không ghi vào cơ sở dữ liệu.</summary>
    public bool DryRun { get; init; }
}

public sealed class GenerateTripsResult
{
    public bool DryRun { get; init; }

    /// <summary>Số chuyến mới được tạo (hoặc sẽ được tạo nếu DryRun).</summary>
    public int Created { get; init; }

    /// <summary>Số chuyến bỏ qua vì đã tồn tại chuyến cùng lịch trình và cùng giờ xuất bến.</summary>
    public int Skipped { get; init; }

    /// <summary>Số mốc giờ bỏ qua vì đã qua so với thời điểm hiện tại (chỉ xảy ra khi sinh cho hôm nay).</summary>
    public int SkippedPast { get; init; }

    /// <summary>Giờ xuất bến của các chuyến mới, giờ UTC, theo thứ tự thời gian.</summary>
    public IReadOnlyList<DateTime> Departures { get; init; } = [];
}

public sealed class ScheduleTripDto
{
    public long Id { get; init; }
    public long ScheduleId { get; init; }

    /// <summary>Giờ UTC. Frontend đổi sang giờ địa phương khi hiển thị.</summary>
    public DateTime DepartureAt { get; init; }

    public TripStatus Status { get; init; }
    public long? BusId { get; init; }
    public string? PlateNumber { get; init; }
}
