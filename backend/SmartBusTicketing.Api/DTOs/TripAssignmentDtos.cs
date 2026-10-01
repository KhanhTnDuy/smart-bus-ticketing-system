using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

// ==========================================
// 1. Phân công xe và nhân sự (Trip Assignment)
// ==========================================

public sealed class TripAssignmentDto
{
    public long TripId { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string RouteStartPoint { get; init; } = string.Empty;
    public string RouteEndPoint { get; init; } = string.Empty;
    public long? ScheduleId { get; init; }
    public DateTime DepartureAt { get; init; }
    public DateTime EstimatedArrivalAt { get; init; }
    public int EstimatedDurationMinutes { get; init; }
    public TripStatus Status { get; init; }
    public string StatusText { get; init; } = string.Empty;
    public int DelayMinutes { get; init; }

    public BusAssignmentInfo? Bus { get; init; }
    public StaffAssignmentInfo? Driver { get; init; }
    public StaffAssignmentInfo? Conductor { get; init; }

    public bool IsFullyAssigned => Bus != null && Driver != null;
    public bool HasConductor => Conductor != null;
    public int BookedTicketsCount { get; init; }
}

public sealed class BusAssignmentInfo
{
    public long Id { get; init; }
    public string PlateNumber { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public BusStatus Status { get; init; }
}

public sealed class StaffAssignmentInfo
{
    public long AccountId { get; init; }
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public StaffDuty Duty { get; init; }
}

public sealed class AssignTripRequest
{
    public long? BusId { get; init; }
    public long? DriverId { get; init; }
    public long? ConductorId { get; init; }
    public string? Notes { get; init; }
}

public sealed class BatchAssignTripRequest
{
    [Required, MinLength(1)]
    public List<long> TripIds { get; init; } = [];
    public long? BusId { get; init; }
    public long? DriverId { get; init; }
    public long? ConductorId { get; init; }
    public string? Notes { get; init; }
}

public sealed class BatchAssignResultDto
{
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailedCount { get; set; }
    public List<string> SuccessTripIds { get; set; } = [];
    public List<BatchAssignErrorItem> Errors { get; set; } = [];
}

public sealed class BatchAssignErrorItem
{
    public long TripId { get; init; }
    public string Reason { get; init; } = string.Empty;
}

public sealed class UnassignTripRequest
{
    public bool UnassignBus { get; init; } = true;
    public bool UnassignDriver { get; init; } = true;
    public bool UnassignConductor { get; init; } = true;
}

public enum AssignmentStateFilter
{
    All,
    FullyAssigned,
    PartiallyAssigned,
    Unassigned
}

public sealed class TripAssignmentFilter
{
    public long? RouteId { get; init; }
    public DateOnly? Date { get; init; }
    public DateTime? FromUtc { get; init; }
    public DateTime? ToUtc { get; init; }
    public TripStatus? Status { get; init; }
    public AssignmentStateFilter? State { get; init; }
    public long? BusId { get; init; }
    public long? DriverId { get; init; }
    public long? ConductorId { get; init; }
    public string? Search { get; init; }
}

// ==========================================
// 2. Tra cứu khả dụng & kiểm tra xung đột
// ==========================================

public sealed class AvailableBusDto
{
    public long Id { get; init; }
    public string PlateNumber { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public BusStatus Status { get; init; }
    public bool IsAvailable { get; init; }
    public string? UnavailableReason { get; init; }
}

public sealed class AvailableStaffDto
{
    public long AccountId { get; init; }
    public string Username { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public AccountRole Role { get; init; }
    public bool IsAvailable { get; init; }
    public string? UnavailableReason { get; init; }
}

public sealed class ConflictCheckRequest
{
    [Required]
    public DateTime DepartureAt { get; init; }
    [Required]
    public long RouteId { get; init; }
    public long? ExcludeTripId { get; init; }
    public long? BusId { get; init; }
    public long? DriverId { get; init; }
    public long? ConductorId { get; init; }
}

public sealed class ConflictCheckResponse
{
    public bool HasConflict { get; init; }
    public List<string> Conflicts { get; init; } = [];
}

// ==========================================
// 3. Quản lý Chuyến chạy (Trip Management)
// ==========================================

public sealed class CreateTripRequest
{
    [Range(1, long.MaxValue)]
    public long RouteId { get; init; }
    public long? ScheduleId { get; init; }
    [Required]
    public DateTime DepartureAt { get; init; }
    public long? BusId { get; init; }
    public long? DriverId { get; init; }
    public long? ConductorId { get; init; }
}

public sealed class UpdateTripStatusRequest
{
    [Required]
    public TripStatus Status { get; init; }
    [Range(0, 1440)]
    public int DelayMinutes { get; init; }
}

// ==========================================
// 4. Lịch trình tài xế / phụ xe (Driver / Conductor Schedule)
// ==========================================

public sealed class DriverScheduleDto
{
    public long TripId { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string StartPoint { get; init; } = string.Empty;
    public string EndPoint { get; init; } = string.Empty;
    public DateTime DepartureAt { get; init; }
    public DateTime EstimatedArrivalAt { get; init; }
    public TripStatus Status { get; init; }
    public string Duty { get; init; } = string.Empty;
    public string? BusPlate { get; init; }
    public int? BusCapacity { get; init; }
    public string? PartnerName { get; init; }
    public string? PartnerPhone { get; init; }
    public string? PartnerDuty { get; init; }
    public List<RouteStopSummaryDto> Stops { get; init; } = [];
}

public sealed class RouteStopSummaryDto
{
    public long StopId { get; init; }
    public string StopName { get; init; } = string.Empty;
    public int StopOrder { get; init; }
    public int MinutesFromStart { get; init; }
}

// ==========================================
// 5. Quản lý Xe buýt (Bus Management)
// ==========================================

public sealed class BusDto
{
    public long Id { get; init; }
    public string PlateNumber { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public BusStatus Status { get; init; }
    public string StatusText { get; init; } = string.Empty;
    public int TotalSeats { get; init; }
    public int ActiveTripsCount { get; init; }
}

public sealed class BusRequest
{
    [Required, StringLength(20, MinimumLength = 3)]
    public string PlateNumber { get; init; } = string.Empty;

    [Range(10, 120)]
    public int Capacity { get; init; } = 40;

    public BusStatus Status { get; init; } = BusStatus.Active;
}
