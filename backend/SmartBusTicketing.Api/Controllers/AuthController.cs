using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, AuditLogService audit, JwtTokenService jwt) : ControllerBase
{
    /// <summary>Đăng nhập bằng username hoặc email, trả về JWT dùng cho các endpoint có [Authorize].</summary>
    [HttpPost("login"), AllowAnonymous]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var account = await db.Accounts.FirstOrDefaultAsync(a =>
            a.Username == request.Identity || a.Email == request.Identity, ct);

        if (account is null || !account.Active || !PasswordService.Verify(request.Password, account.PasswordHash))
        {
            await audit.WriteAsync(null, request.Identity, "Login failed", AuditActionType.Login, status: AuditStatus.Failure, ct: ct);
            return Unauthorized(new { message = "Username/email hoặc mật khẩu không đúng." });
        }

        await audit.WriteAsync(account.Id, account.Username, "Login", AuditActionType.Login, $"USR-{account.Id}", ct: ct);
        return Ok(new
        {
            accessToken = jwt.CreateAccessToken(account),
            tokenType = "Bearer",
            expiresIn = jwt.ExpiresInSeconds,
            user = new { account.Id, account.Username, account.FullName, account.Email, account.Phone, account.Role, account.Active }
        });
    }

    /// <summary>Đăng xuất: JWT là stateless nên chỉ ghi nhật ký, client tự xoá token.</summary>
    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var accountId = User.AccountId();
        var username = User.Username() ?? "unknown";
        await audit.WriteAsync(accountId, username, "Logout", AuditActionType.Logout,
            accountId.HasValue ? $"USR-{accountId}" : null, ct: ct);
        return Ok(new { message = "Đăng xuất thành công." });
    }

    /// <summary>Thông tin tài khoản đang đăng nhập, để client xác nhận token còn hiệu lực.</summary>
    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var accountId = User.AccountId();
        if (accountId is null) return Unauthorized();

        var account = await db.Accounts.AsNoTracking().FirstOrDefaultAsync(a => a.Id == accountId, ct);
        if (account is null || !account.Active) return Unauthorized();

        return Ok(new { account.Id, account.Username, account.FullName, account.Email, account.Phone, account.Role, account.Active });
    }
}
