using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

// ---------- Báo cáo sự cố ----------

public sealed class CreateIncidentRequest
{
    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn chuyến xe gặp sự cố.")]
    public long TripId { get; init; }

    public IncidentType IncidentType { get; init; }

    /// <summary>Số phút dự kiến trễ do sự cố, 0 nếu không ảnh hưởng giờ chạy.</summary>
    [Range(0, 600, ErrorMessage = "Số phút trễ phải từ 0 đến 600.")]
    public int DelayMinutes { get; init; }

    [Required(ErrorMessage = "Vui lòng nhập vị trí xảy ra sự cố."), StringLength(300)]
    public string Location { get; init; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng mô tả sự cố."), StringLength(4000)]
    public string Description { get; init; } = string.Empty;
}

public sealed class ResolveIncidentRequest
{
    [StringLength(2000)]
    public string? Note { get; init; }
}

public sealed class IncidentDto
{
    public long Id { get; init; }
    public long TripId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public DateTime DepartureAt { get; init; }
    public string? BusPlate { get; init; }
    public IncidentType IncidentType { get; init; }
    public int DelayMinutes { get; init; }
    public IncidentStatus Status { get; init; }
    public string Location { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public long ReportedBy { get; init; }
    public string ReporterName { get; init; } = string.Empty;
    public string? ReporterPhone { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? ResolvedAt { get; init; }
    public string? ResolvedByName { get; init; }
    public string? ResolutionNote { get; init; }
}

// ---------- Quét vé QR ----------

public sealed class ScanTicketRequest
{
    [Required(ErrorMessage = "Vui lòng nhập hoặc quét mã QR."), StringLength(200)]
    public string QrCode { get; init; } = string.Empty;

    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn chuyến đang phụ trách.")]
    public long TripId { get; init; }
}

public sealed class ScannedTicketInfo
{
    public long TicketId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public string PassengerName { get; init; } = string.Empty;
    public string SeatCode { get; init; } = string.Empty;
    public string BoardStop { get; init; } = string.Empty;
    public string AlightStop { get; init; } = string.Empty;
    public long TripId { get; init; }
}

public sealed class ScanTicketResponse
{
    /// <summary>Valid, Invalid, AlreadyUsed, WrongTrip hoặc Expired.</summary>
    public string Result { get; init; } = string.Empty;
    public bool Accepted { get; init; }
    public string Message { get; init; } = string.Empty;
    public ScannedTicketInfo? Ticket { get; init; }
}

public sealed class TicketScanDto
{
    public long Id { get; init; }
    public DateTime ScannedAt { get; init; }
    public string Result { get; init; } = string.Empty;
    public string? SeatCode { get; init; }
    public string? PassengerName { get; init; }
    public long TripId { get; init; }
}
