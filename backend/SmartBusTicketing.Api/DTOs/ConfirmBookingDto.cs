using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public class ConfirmBookingDto
{
    [Required(ErrorMessage = "Mã chuyến xe (TripId) không được để trống!")]
    public long TripId { get; set; }

    [Required(ErrorMessage = "Danh sách ghế không được để trống!")]
    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 ghế để đặt!")]
    public List<long> SeatIds { get; set; } = new();

    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
}
