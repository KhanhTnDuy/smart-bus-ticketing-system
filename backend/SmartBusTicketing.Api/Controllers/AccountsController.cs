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
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(a => a.Username.Contains(search) || a.FullName.Contains(search));
        if (role.HasValue) query = query.Where(a => a.Role == role.Value);
        if (active.HasValue) query = query.Where(a => a.Active == active.Value);
        return Ok(await query.OrderByDescending(a => a.Id).Select(a => new { a.Id, a.Username, a.FullName, a.Email, a.Phone, a.Role, a.Active, a.CreatedAt, a.UpdatedAt }).ToListAsync(ct));
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var a = await db.Accounts.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new { x.Id, x.Username, x.FullName, x.Email, x.Phone, x.Role, x.Active, x.CreatedAt, x.UpdatedAt }).FirstOrDefaultAsync(ct);
        return a is null ? NotFound() : Ok(a);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAccountRequest request, CancellationToken ct)
    {
        if (await db.Accounts.AnyAsync(a => a.Username == request.Username, ct)) return Conflict(new { message = "Username đã tồn tại." });
        if (request.Email is not null && await db.Accounts.AnyAsync(a => a.Email == request.Email, ct)) return Conflict(new { message = "Email đã tồn tại." });
        if (request.Phone is not null && await db.Accounts.AnyAsync(a => a.Phone == request.Phone, ct)) return Conflict(new { message = "Số điện thoại đã tồn tại." });
        var now = DateTime.UtcNow;
        var entity = new Account { Username = request.Username.Trim(), PasswordHash = PasswordService.Hash(request.Password), FullName = request.FullName.Trim(), Email = request.Email?.Trim(), Phone = request.Phone?.Trim(), Role = request.Role, Active = request.Active, CreatedAt = now, UpdatedAt = now };
        db.Accounts.Add(entity);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Create account", AuditActionType.Create, $"USR-{entity.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = entity.Id }, new { entity.Id, entity.Username, entity.FullName, entity.Email, entity.Phone, entity.Role, entity.Active, entity.CreatedAt, entity.UpdatedAt });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, UpdateAccountRequest request, CancellationToken ct)
    {
        var entity = await db.Accounts.FindAsync([id], ct);
        if (entity is null) return NotFound();
        if (request.Email is not null && request.Email != entity.Email && await db.Accounts.AnyAsync(a => a.Id != id && a.Email == request.Email, ct)) return Conflict(new { message = "Email đã tồn tại." });
        if (request.Phone is not null && request.Phone != entity.Phone && await db.Accounts.AnyAsync(a => a.Id != id && a.Phone == request.Phone, ct)) return Conflict(new { message = "Số điện thoại đã tồn tại." });
        if (request.FullName is not null) entity.FullName = request.FullName.Trim();
        if (request.Email is not null) entity.Email = request.Email.Trim();
        if (request.Phone is not null) entity.Phone = request.Phone.Trim();
        if (request.Role.HasValue) entity.Role = request.Role.Value;
        if (request.Active.HasValue) entity.Active = request.Active.Value;
        if (!string.IsNullOrWhiteSpace(request.Password)) entity.PasswordHash = PasswordService.Hash(request.Password);
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Update account", AuditActionType.Update, $"USR-{id}", ct: ct);
        return Ok(new { entity.Id, entity.Username, entity.FullName, entity.Email, entity.Phone, entity.Role, entity.Active, entity.UpdatedAt });
    }

    [HttpPatch("{id:long}/role")]
    public async Task<IActionResult> UpdateRole(long id, UpdateRoleRequest request, CancellationToken ct)
    {
        var entity = await db.Accounts.FindAsync([id], ct);
        if (entity is null) return NotFound();
        var old = entity.Role;
        entity.Role = request.Role;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), $"Change role {old} -> {request.Role}", AuditActionType.StatusChange, $"USR-{id}", ct: ct);
        return Ok(new { entity.Id, entity.Role });
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var entity = await db.Accounts.FindAsync([id], ct);
        if (entity is null) return NotFound();
        entity.Active = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(GetActorId(), GetActorName(), "Deactivate account", AuditActionType.Delete, $"USR-{id}", ct: ct);
        return NoContent();
    }

    // Danh tính lấy từ JWT đã xác thực, không còn đọc từ header do client tự gửi.
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "system";
}
