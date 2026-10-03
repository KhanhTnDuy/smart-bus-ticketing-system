using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public class ConfirmBookingDto
{
    [Range(1, long.MaxValue, ErrorMessage = "Mã chuyến xe (TripId) phải lớn hơn 0!")]
    public long TripId { get; set; }

    [Required(ErrorMessage = "Danh sách ghế không được để trống!")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 ghế để đặt!")]
    [MaxLength(4, ErrorMessage = "Chỉ được chọn tối đa 4 ghế mỗi lần đặt!")]
    public List<long> SeatIds { get; set; } = new();

    [Range(1, long.MaxValue, ErrorMessage = "Điểm lên xe (BoardStopId) phải lớn hơn 0!")]
    public long BoardStopId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "Điểm xuống xe (AlightStopId) phải lớn hơn 0!")]
    public long AlightStopId { get; set; }
}
