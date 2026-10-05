using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>US: quản lý mã giảm giá. Chỉ Admin và Manager được xem hoặc thay đổi voucher.</summary>
[ApiController]
[Route("api/vouchers")]
[Authorize(Roles = "Admin,Manager")]
public sealed class VouchersController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<VoucherDto>>> GetAll(
        [FromQuery] string? search, [FromQuery] bool? active, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var query = db.Vouchers.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(v => v.Code.Contains(term));
        }
        if (active.HasValue)
            query = active.Value
                ? query.Where(v => v.StartAt <= now && v.EndAt > now)
                : query.Where(v => v.StartAt > now || v.EndAt <= now);

        var vouchers = await query.OrderByDescending(v => v.Id)
            .Select(v => new VoucherDto(v.Id, v.Code, v.DiscountType, v.DiscountValue,
                v.StartAt, v.EndAt, v.UsageLimit, v.Bookings.Count(b => b.Status == BookingStatus.Confirmed)))
            .ToListAsync(ct);
        return Ok(vouchers);
    }

    [HttpGet("{id:long}")]
    public async Task<ActionResult<VoucherDto>> GetById(long id, CancellationToken ct)
    {
        var voucher = await ProjectVoucher(db.Vouchers.AsNoTracking())
            .FirstOrDefaultAsync(v => v.Id == id, ct);
        return voucher is null ? NotFound() : Ok(voucher);
    }

    [HttpPost]
    public async Task<ActionResult<VoucherDto>> Create(VoucherRequest request, CancellationToken ct)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.Vouchers.AnyAsync(v => v.Code == code, ct))
            return Conflict(new ProblemDetails { Status = 409, Title = $"Mã voucher '{code}' đã tồn tại." });

        var voucher = new Voucher
        {
            Code = code,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            StartAt = AsUtc(request.StartAt),
            EndAt = AsUtc(request.EndAt),
            UsageLimit = request.UsageLimit
        };
        db.Vouchers.Add(voucher);
        await db.SaveChangesAsync(ct);

        var details = Describe(voucher);
        await LogAsync($"Tạo voucher {voucher.Code}", AuditActionType.Create, voucher.Id, details, ct);
        return CreatedAtAction(nameof(GetById), new { id = voucher.Id }, ToDto(voucher, 0));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<VoucherDto>> Update(long id, VoucherRequest request, CancellationToken ct)
    {
        var voucher = await db.Vouchers.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (voucher is null) return NotFound();

        var code = request.Code.Trim().ToUpperInvariant();
        if (await db.Vouchers.AnyAsync(v => v.Id != id && v.Code == code, ct))
            return Conflict(new ProblemDetails { Status = 409, Title = $"Mã voucher '{code}' đã tồn tại." });

        var before = Describe(voucher);
        voucher.Code = code;
        voucher.DiscountType = request.DiscountType;
        voucher.DiscountValue = request.DiscountValue;
        voucher.StartAt = AsUtc(request.StartAt);
        voucher.EndAt = AsUtc(request.EndAt);
        voucher.UsageLimit = request.UsageLimit;
        await db.SaveChangesAsync(ct);

        var after = Describe(voucher);
        await LogAsync($"Cập nhật voucher {voucher.Code}", AuditActionType.Update, id,
            $"Trước: {before}; Sau: {after}", ct);
        var usedCount = await db.Bookings.CountAsync(b => b.VoucherId == id && b.Status == BookingStatus.Confirmed, ct);
        return Ok(ToDto(voucher, usedCount));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var voucher = await db.Vouchers.FirstOrDefaultAsync(v => v.Id == id, ct);
        if (voucher is null) return NotFound();

        var details = Describe(voucher);
        var code = voucher.Code;
        db.Vouchers.Remove(voucher);
        await db.SaveChangesAsync(ct);
        await LogAsync($"Xóa voucher {code}", AuditActionType.Delete, id, details, ct);
        return NoContent();
    }

    private Task LogAsync(string action, AuditActionType type, long id, string details, CancellationToken ct) =>
        audit.WriteAsync(User.AccountId(), User.Username() ?? "system", action, type,
            $"VOUCHER-{id}", AuditStatus.Success, details, ct);

    private static IQueryable<VoucherDto> ProjectVoucher(IQueryable<Voucher> query) => query
        .Select(v => new VoucherDto(v.Id, v.Code, v.DiscountType, v.DiscountValue,
            v.StartAt, v.EndAt, v.UsageLimit, v.Bookings.Count(b => b.Status == BookingStatus.Confirmed)));

    private static VoucherDto ToDto(Voucher v, int usedCount) =>
        new(v.Id, v.Code, v.DiscountType, v.DiscountValue, v.StartAt, v.EndAt, v.UsageLimit, usedCount);

    private static string Describe(Voucher v) =>
        $"Mã: {v.Code}; loại: {v.DiscountType}; mức giảm: {v.DiscountValue}; " +
        $"hiệu lực UTC: {v.StartAt:O} đến {v.EndAt:O}; giới hạn: {v.UsageLimit}";

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
