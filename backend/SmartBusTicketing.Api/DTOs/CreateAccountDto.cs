using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public class CreateAccountDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống!")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải từ 3 đến 50 ký tự!")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống!")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải từ 6 ký tự trở lên!")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ và tên không được để trống!")]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "Email không đúng định dạng!")]
    public string? Email { get; set; }

    [Phone(ErrorMessage = "Số điện thoại không đúng định dạng!")]
    public string? Phone { get; set; }

    [Required(ErrorMessage = "Vai trò không được để trống!")]
    public AccountRole Role { get; set; } = AccountRole.Passenger;
}
