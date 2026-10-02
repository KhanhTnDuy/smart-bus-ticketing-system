using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize(Roles = "Admin")]
public class AccountsController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] AccountRole? role, [FromQuery] bool? active, CancellationToken ct)
    {
        var query = db.Accounts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(a => a.Username.Contains(search) || a.FullName.Contains(search));

        if (role.HasValue)
            query = query.Where(a => a.Role == role.Value);

        if (active.HasValue)
            query = query.Where(a => a.Active == active.Value);

        return Ok(await query.OrderByDescending(a => a.Id)
            .Select(a => new { a.Id, a.Username, a.FullName, a.Email, a.Phone, a.Role, a.Active, a.CreatedAt, a.UpdatedAt })
            .ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var a = await db.Accounts.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new { x.Id, x.Username, x.FullName, x.Email, x.Phone, x.Role, x.Active, x.CreatedAt, x.UpdatedAt })
            .FirstOrDefaultAsync(ct);

        return a is null ? NotFound() : Ok(a);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAccountDto dto, CancellationToken ct)
    {
        // 1. Chặn dữ liệu rỗng (Empty Validation)
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // 2. Bắt lỗi trùng lặp tài khoản trên máy chủ (Conflict Check)
        var isExist = await db.Accounts.AnyAsync(a => a.Username == dto.Username, ct);
        if (isExist)
        {
            return Conflict(new { message = $"Tài khoản '{dto.Username}' đã tồn tại trên máy chủ!" });
        }

        // 3. Tạo tài khoản mới
        var account = new Account
        {
            Username = dto.Username,
            PasswordHash = PasswordService.HashPassword(dto.Password),
            FullName = dto.FullName,
            Role = (AccountRole)dto.Role,
            Active = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        // 4. Ghi Nhật ký thao tác hệ thống
        await audit.LogAsync("ADMIN", "CREATE_ACCOUNT", $"Tạo tài khoản: {account.Username}");

        return Ok(new { message = "Tạo tài khoản thành công!", id = account.Id });
    }
}
