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
}

/// <summary>Kết quả hủy vé.</summary>
public sealed class CancelTicketResultDto
{
    public string Message { get; init; } = string.Empty;
    public long TicketId { get; init; }
    public string SeatCode { get; init; } = string.Empty;
    public long ChangeRequestId { get; init; }

    /// <summary>
    /// Số tiền sẽ được hoàn. Vé chưa thanh toán thì bằng 0 và không có hồ sơ hoàn tiền nào
    /// được tạo, vì hệ thống chưa có luồng thanh toán nên không có giao dịch để hoàn.
    /// </summary>
    public decimal RefundAmount { get; init; }

    public bool BookingCancelled { get; init; }
}

/// <summary>Kết quả đổi vé: vé cũ chuyển sang Exchanged và một vé mới được phát.</summary>
public sealed class ExchangeTicketResultDto
{
    public string Message { get; init; } = string.Empty;
    public long OldTicketId { get; init; }
    public long NewTicketId { get; init; }
    public string NewSeatCode { get; init; } = string.Empty;
    public long NewTripId { get; init; }
    public string NewDepartureDate { get; init; } = string.Empty;
    public string NewDepartureTime { get; init; } = string.Empty;
    public long ChangeRequestId { get; init; }

    /// <summary>
    /// Chênh lệch giá giữa chuyến mới và chuyến cũ, chỉ để thông báo. Hệ thống chưa thu thêm
    /// hay hoàn lại phần chênh vì chưa có luồng thanh toán.
    /// </summary>
    public decimal PriceDifference { get; init; }
}
