namespace SmartBusTicketing.Api.DTOs;

/// <summary>Ghế trên xe được gán cho một chuyến và trạng thái đặt chỗ hiện tại.</summary>
public sealed class TripSeatDto
{
    /// <summary>Ghế còn trống, khách chọn được.</summary>
    public const string StatusAvailable = "Available";

    /// <summary>Khách khác đang thanh toán và còn hạn giữ chỗ; ghế sẽ tự trống lại khi hết hạn.</summary>
    public const string StatusHeld = "Held";

    /// <summary>Đã trả tiền (lượt đặt Confirmed) hoặc vé đã quét.</summary>
    public const string StatusSold = "Sold";

    public long SeatId { get; init; }
    public string SeatCode { get; init; } = string.Empty;
    public int Row { get; init; }
    public int Column { get; init; }

    /// <summary>Một trong <see cref="StatusAvailable"/>, <see cref="StatusHeld"/>, <see cref="StatusSold"/>.</summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>False với cả ghế đang giữ lẫn ghế đã bán: cả hai đều không chọn được lúc này.</summary>
    public bool IsAvailable { get; init; }
}
