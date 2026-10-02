namespace SmartBusTicketing.Api.DTOs;

/// <summary>Ghế trên xe được gán cho một chuyến và trạng thái đặt chỗ hiện tại.</summary>
public sealed class TripSeatDto
{
    public long SeatId { get; init; }
    public string SeatCode { get; init; } = string.Empty;
    public int Row { get; init; }
    public int Column { get; init; }
    public string Status { get; init; } = string.Empty;
    public bool IsAvailable { get; init; }
}
