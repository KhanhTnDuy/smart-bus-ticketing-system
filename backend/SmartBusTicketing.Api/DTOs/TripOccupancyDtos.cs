using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public sealed class TripOccupancyDto
{
    public long TripId { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public DateTime DepartureAt { get; init; }
    public TripStatus Status { get; init; }
    public long? BusId { get; init; }
    public string? BusPlate { get; init; }
    public int BookedSeats { get; init; }
    public int TotalSeats { get; init; }
    /// <summary>Null when a trip has no assigned bus and its capacity is unknown.</summary>
    public decimal? OccupancyPercent { get; init; }
}
