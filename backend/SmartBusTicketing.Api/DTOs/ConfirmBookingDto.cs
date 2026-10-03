using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public class ConfirmBookingDto
{
    /// <summary>Số ghế tối đa cho một lần đặt, khớp với giới hạn hiển thị ở RouteBookingPage.</summary>
    public const int MaxSeatsPerBooking = 4;

    // [Required] không dùng được cho kiểu giá trị vì long luôn có giá trị (mặc định 0),
    // nên dùng [Range] để bắt trường hợp client quên truyền hoặc truyền 0.
    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn chuyến xe.")]
    public long TripId { get; set; }

    [Required(ErrorMessage = "Danh sách ghế không được để trống!")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 ghế để đặt!")]
    [MaxLength(MaxSeatsPerBooking, ErrorMessage = "Mỗi lần đặt chỉ được chọn tối đa 4 ghế!")]
    public List<long> SeatIds { get; set; } = new();

    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn điểm lên xe.")]
    public long BoardStopId { get; set; }

    [Range(1, long.MaxValue, ErrorMessage = "Vui lòng chọn điểm xuống xe.")]
    public long AlightStopId { get; set; }
}
