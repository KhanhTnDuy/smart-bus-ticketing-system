using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpPost("login")]
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
            accessToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            tokenType = "Bearer",
            user = new { account.Id, account.Username, account.FullName, account.Email, account.Phone, account.Role, account.Active }
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var accountId = Request.Headers.TryGetValue("X-User-Id", out var raw) && long.TryParse(raw, out var id) ? id : (long?)null;
        var username = accountId.HasValue
            ? (await db.Accounts.FindAsync([accountId.Value], ct))?.Username ?? "unknown"
            : "unknown";
        await audit.WriteAsync(accountId, username, "Logout", AuditActionType.Logout, accountId.HasValue ? $"USR-{accountId}" : null, ct: ct);
        return Ok(new { message = "Đăng xuất thành công." });
    }
}
