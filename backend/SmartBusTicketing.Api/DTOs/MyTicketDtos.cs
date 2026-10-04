namespace SmartBusTicketing.Api.DTOs;

/// <summary>
/// Một vé của hành khách đang đăng nhập. Mỗi ghế trong một lượt đặt là một vé riêng,
/// nên một lượt đặt 3 ghế sẽ trả về 3 phần tử cùng BookingCode.
/// </summary>
public sealed class MyTicketDto
{
    public long TicketId { get; init; }
    public long BookingId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public string QrCode { get; init; } = string.Empty;
    public string SeatCode { get; init; } = string.Empty;

    /// <summary>Trạng thái của vé: Held, Valid, Used, Cancelled, Exchanged, Expired.</summary>
    public string Status { get; init; } = string.Empty;

    /// <summary>Trạng thái của lượt đặt: Pending, Confirmed, Cancelled, Expired.</summary>
    public string BookingStatus { get; init; } = string.Empty;

    /// <summary>Hết thời điểm này mà lượt đặt còn Pending thì chỗ đã bị nhả.</summary>
    public DateTime HoldExpiresAt { get; init; }

    public long TripId { get; init; }
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;

    /// <summary>Ngày đi theo giờ Việt Nam, định dạng YYYY-MM-DD.</summary>
    public string DepartureDate { get; init; } = string.Empty;

    /// <summary>Giờ xuất bến theo giờ Việt Nam, định dạng HH:mm.</summary>
    public string DepartureTime { get; init; } = string.Empty;

    public string BusPlate { get; init; } = string.Empty;
    public string BoardStopName { get; init; } = string.Empty;
    public string AlightStopName { get; init; } = string.Empty;

    /// <summary>
    /// Giá của riêng vé này. Lượt đặt lưu tổng tiền và backend tính tổng bằng
    /// đơn giá × số ghế, nên chia cho số vé là con số đúng, không phải ước lượng.
    /// </summary>
    public decimal Price { get; init; }

    /// <summary>Tổng tiền của cả lượt đặt.</summary>
    public decimal BookingFinalAmount { get; init; }

    public string PassengerName { get; init; } = string.Empty;
    public string? PassengerPhone { get; init; }
}
