namespace SmartBus.Api.DTOs;

public record BusRequest(
    string Code,
    string PlateNumber,
    int SeatRows,
    int SeatColumns,
    bool Active = true
);

public record AssignmentRequest(
    int BusId,
    int DriverId,
    int? AssistantId = null,
    string? DriverName = null,
    string? AssistantName = null
);
