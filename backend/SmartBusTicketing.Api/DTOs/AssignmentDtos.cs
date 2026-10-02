using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public sealed class AssignmentDto
{
    public string Id { get; init; } = string.Empty; // "ASN-001"
    public long RawId { get; init; }
    public string RouteId { get; init; } = string.Empty;
    public string? RouteCode { get; init; }
    public string? RouteName { get; init; }
    public string BusPlate { get; init; } = string.Empty;
    public string DriverId { get; init; } = string.Empty;
    public string DriverName { get; init; } = string.Empty;
    public string? AssistantId { get; init; }
    public string? AssistantName { get; init; }
    public string Date { get; init; } = string.Empty; // YYYY-MM-DD
    public string Shift { get; init; } = string.Empty;
    public string ShiftHours { get; init; } = string.Empty;
    public DateTime StartTime { get; init; }
    public DateTime EndTime { get; init; }
    public string Status { get; init; } = string.Empty;
    public string? Notes { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class CreateAssignmentRequest
{
    [Required]
    public string RouteId { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string BusPlate { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string DriverId { get; set; } = string.Empty;

    [Required, StringLength(150)]
    public string DriverName { get; set; } = string.Empty;

    [StringLength(50)]
    public string? AssistantId { get; set; }

    [StringLength(150)]
    public string? AssistantName { get; set; }

    [Required]
    public string Date { get; set; } = string.Empty; // YYYY-MM-DD

    [Required, StringLength(50)]
    public string Shift { get; set; } = "CA_SANG";

    [Required, StringLength(100)]
    public string ShiftHours { get; set; } = "05:30 — 13:30";

    [StringLength(50)]
    public string Status { get; set; } = "ASSIGNED";

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public sealed class UpdateAssignmentRequest
{
    [Required]
    public string RouteId { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string BusPlate { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string DriverId { get; set; } = string.Empty;

    [Required, StringLength(150)]
    public string DriverName { get; set; } = string.Empty;

    [StringLength(50)]
    public string? AssistantId { get; set; }

    [StringLength(150)]
    public string? AssistantName { get; set; }

    [Required]
    public string Date { get; set; } = string.Empty;

    [Required, StringLength(50)]
    public string Shift { get; set; } = "CA_SANG";

    [Required, StringLength(100)]
    public string ShiftHours { get; set; } = "05:30 — 13:30";

    [StringLength(50)]
    public string Status { get; set; } = "ASSIGNED";

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public sealed class CheckConflictRequest
{
    public string? BusPlate { get; set; }
    public string? DriverId { get; set; }
    public string? DriverName { get; set; }
    public string? AssistantId { get; set; }
    public string? AssistantName { get; set; }
    public string Date { get; set; } = string.Empty;
    public string Shift { get; set; } = "CA_SANG";
    public string ShiftHours { get; set; } = "05:30 — 13:30";
    public long? ExcludeId { get; set; }
}

public sealed class ConflictCheckResult
{
    public bool HasConflict { get; set; }
    public string? ConflictType { get; set; } // "BUS", "DRIVER", "ASSISTANT", "TRIP"
    public string? Message { get; set; }
    public string? ConflictingAssignmentCode { get; set; }
}
