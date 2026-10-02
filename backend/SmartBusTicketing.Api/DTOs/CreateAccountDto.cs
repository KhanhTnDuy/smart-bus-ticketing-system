using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public class CreateAccountDto
{
    [Required(ErrorMessage = "Tên đăng nhập không được để trống!")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Tên đăng nhập phải từ 3 đến 50 ký tự!")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "Mật khẩu không được để trống!")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự!")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Họ và tên không được để trống!")]
    public string FullName { get; set; } = string.Empty;

    public int Role { get; set; } = 4;
}
