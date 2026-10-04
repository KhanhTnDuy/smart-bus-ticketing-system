using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public sealed class CancelTicketDto
{
    [Required(ErrorMessage = "Vui lòng nhập lý do hủy vé!")]
    [StringLength(255, MinimumLength = 3, ErrorMessage = "Lý do hủy vé phải từ 3 đến 255 ký tự!")]
    public string Reason { get; set; } = string.Empty;
}

public sealed class ExchangeTicketDto
{
    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn chuyến xe mới.")]
    public long NewTripId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn ghế mới.")]
    public long NewSeatId { get; set; }

    [StringLength(255, ErrorMessage = "Lý do đổi vé tối đa 255 ký tự!")]
    public string? Reason { get; set; }
}

/// <summary>Kết quả gửi yêu cầu hủy hoặc đổi vé. Yêu cầu chưa có hiệu lực tới khi được duyệt.</summary>
public sealed class ChangeRequestCreatedDto
{
    public string Message { get; init; } = string.Empty;
    public long ChangeRequestId { get; init; }
    public long TicketId { get; init; }
    public string SeatCode { get; init; } = string.Empty;
    public string RequestType { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
}

/// <summary>Một yêu cầu hủy/đổi vé, dùng cho cả hành khách xem của mình và quản lý duyệt.</summary>
public sealed class TicketChangeRequestDto
{
    public long Id { get; init; }
    public string RequestType { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Reason { get; init; }
    /// <summary>Thời điểm gửi yêu cầu, giờ Việt Nam, định dạng yyyy-MM-dd HH:mm.</summary>
    public string CreatedAt { get; init; } = string.Empty;

    /// <summary>Thời điểm xử lý, giờ Việt Nam, định dạng yyyy-MM-dd HH:mm. Null nếu chưa xử lý.</summary>
    public string? ProcessedAt { get; init; }
    public string? ProcessedByName { get; init; }

    // Vé đang xin hủy/đổi
    public long TicketId { get; init; }
    public string BookingCode { get; init; } = string.Empty;
    public string SeatCode { get; init; } = string.Empty;
    public string TicketStatus { get; init; } = string.Empty;
    public decimal TicketPrice { get; init; }

    // Chuyến hiện tại của vé
    public long TripId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string DepartureDate { get; init; } = string.Empty;
    public string DepartureTime { get; init; } = string.Empty;
    public string BusPlate { get; init; } = string.Empty;

    // Chỉ có với yêu cầu đổi vé
    public long? NewTripId { get; init; }
    public string? NewDepartureDate { get; init; }
    public string? NewDepartureTime { get; init; }
    public string? NewBusPlate { get; init; }
    public long? NewSeatId { get; init; }
    public string? NewSeatCode { get; init; }

    // Người gửi yêu cầu
    public long PassengerId { get; init; }
    public string PassengerName { get; init; } = string.Empty;
    public string? PassengerPhone { get; init; }
}

/// <summary>Kết quả duyệt một yêu cầu.</summary>
public sealed class ApproveChangeRequestResultDto
{
    public string Message { get; init; } = string.Empty;
    public long ChangeRequestId { get; init; }
    public string Status { get; init; } = string.Empty;

    /// <summary>Với yêu cầu đổi vé: vé mới được phát sau khi duyệt.</summary>
    public long? NewTicketId { get; init; }
    public string? NewSeatCode { get; init; }

    /// <summary>Lượt đặt đã bị đóng vì không còn vé nào còn hiệu lực.</summary>
    public bool BookingCancelled { get; init; }

    /// <summary>
    /// Số tiền sẽ hoàn. Luôn 0 ở thời điểm này: chưa có luồng thanh toán nên không tồn tại
    /// giao dịch nào để hoàn. Giữ trường này để khi có thanh toán thì chỉ cần điền.
    /// </summary>
    public decimal RefundAmount { get; init; }
}
