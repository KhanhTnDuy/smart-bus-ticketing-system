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
    private long GetActorId() => User.AccountId();
    private string GetActorName() => User.Username();

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
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var username = dto.Username.Trim();
        var email = dto.Email?.Trim();
        var phone = dto.Phone?.Trim();

        if (await db.Accounts.AnyAsync(a => a.Username == username, ct))
        {
            return Conflict(new { message = $"Tên đăng nhập '{username}' đã tồn tại!" });
        }

        if (!string.IsNullOrEmpty(email) && await db.Accounts.AnyAsync(a => a.Email == email, ct))
        {
            return Conflict(new { message = $"Email '{email}' đã được sử dụng!" });
        }

        if (!string.IsNullOrEmpty(phone) && await db.Accounts.AnyAsync(a => a.Phone == phone, ct))
        {
            return Conflict(new { message = $"Số điện thoại '{phone}' đã được sử dụng!" });
        }

        var account = new Account
        {
            Username = username,
            PasswordHash = PasswordService.Hash(dto.Password),
            FullName = dto.FullName.Trim(),
            Email = email,
            Phone = phone,
            Role = dto.Role,
            Active = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(GetActorId(), GetActorName(), "CREATE_ACCOUNT", AuditActionType.Create, $"Tài khoản: {account.Username}", ct: ct);

        return CreatedAtAction(nameof(Get), new { id = account.Id }, account);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAccountDto dto, CancellationToken ct)
    {
        var account = await db.Accounts.FindAsync([id], ct);
        if (account is null) return NotFound(new { message = "Không tìm thấy tài khoản!" });

        if (!ModelState.IsValid) return BadRequest(ModelState);

        account.FullName = dto.FullName.Trim();
        account.Email = dto.Email?.Trim();
        account.Phone = dto.Phone?.Trim();
        if (dto.Role.HasValue) account.Role = dto.Role.Value;
        if (dto.Active.HasValue) account.Active = dto.Active.Value;
        if (!string.IsNullOrWhiteSpace(dto.Password)) account.PasswordHash = PasswordService.Hash(dto.Password);
        account.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "UPDATE_ACCOUNT", AuditActionType.Update, $"Tài khoản: {account.Username}", ct: ct);

        return Ok(account);
    }

    [HttpPatch("{id:long}/role")]
    public async Task<IActionResult> UpdateRole(long id, [FromBody] UpdateRoleRequest req, CancellationToken ct)
    {
        var account = await db.Accounts.FindAsync([id], ct);
        if (account is null) return NotFound(new { message = "Không tìm thấy tài khoản!" });

        account.Role = req.Role;
        account.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "UPDATE_ROLE", AuditActionType.Update, $"Tài khoản: {account.Username} -> {req.Role}", ct: ct);

        return Ok(account);
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var account = await db.Accounts.FindAsync([id], ct);
        if (account is null) return NotFound(new { message = "Không tìm thấy tài khoản!" });

        account.Active = false;
        account.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "DISABLE_ACCOUNT", AuditActionType.Delete, $"Tài khoản: {account.Username}", ct: ct);

        return NoContent();
    }
}

public class UpdateRoleRequest
{
    public AccountRole Role { get; set; }
}

public class UpdateAccountDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public AccountRole? Role { get; set; }
    public bool? Active { get; set; }
    public string? Password { get; set; }
}
