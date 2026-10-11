using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// SCRUM-66: Quản lý voucher: Thêm, sửa, xóa và xem danh sách mã giảm giá.
/// SCRUM-67: Kiểm tra voucher: Chặn trùng mã, kiểm tra hạn dùng và số lượt còn lại.
/// </summary>
[ApiController]
[Route("api/vouchers")]
public sealed class VouchersController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private static readonly TimeZoneInfo VnTimeZone = GetVnTimeZone();

    /// <summary>
    /// SCRUM-66: Xem danh sách voucher có lọc tìm kiếm theo mã, trạng thái và loại giảm giá.
    /// Chỉ Admin và Manager có quyền truy cập.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<IReadOnlyList<VoucherDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] DiscountType? discountType,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var query = db.Vouchers
            .Include(v => v.Bookings)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToUpperInvariant();
            query = query.Where(v => v.Code.Contains(term));
        }

        if (discountType.HasValue)
        {
            query = query.Where(v => v.DiscountType == discountType.Value);
        }

        var list = await query
            .OrderByDescending(v => v.Id)
            .ToListAsync(ct);

        var result = list
            .Select(v =>
            {
                var usedCount = v.Bookings.Count(b => b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.HoldExpiresAt > now));
                return ToDto(v, usedCount, now);
            })
            .Where(v =>
            {
                if (string.IsNullOrWhiteSpace(status) || status.Equals("ALL", StringComparison.OrdinalIgnoreCase))
                    return true;
                return v.Status.Equals(status, StringComparison.OrdinalIgnoreCase);
            })
            .ToList();

        return Ok(result);
    }

    /// <summary>
    /// SCRUM-66: Xem chi tiết voucher theo ID.
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<VoucherDto>> GetById(long id, CancellationToken ct)
    {
        var voucher = await db.Vouchers
            .Include(v => v.Bookings)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (voucher is null) return NotFound(new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Không tìm thấy voucher",
            Detail = $"Voucher có ID {id} không tồn tại trong hệ thống."
        });

        var now = DateTime.UtcNow;
        var usedCount = voucher.Bookings.Count(b => b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.HoldExpiresAt > now));
        return Ok(ToDto(voucher, usedCount, now));
    }

    /// <summary>
    /// SCRUM-66 & SCRUM-67: Tạo voucher mới. Chặn trùng mã, kiểm tra tính hợp lệ của hạn dùng và số lượt.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<VoucherDto>> Create(VoucherRequest request, CancellationToken ct)
    {
        var code = request.Code.Trim().ToUpperInvariant();

        // SCRUM-67: Chặn trùng mã
        if (await db.Vouchers.AnyAsync(v => v.Code == code, ct))
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Trùng mã voucher",
                Detail = $"Mã voucher '{code}' đã tồn tại trong hệ thống. Vui lòng chọn mã khác."
            });
        }

        var startAtUtc = AsUtc(request.StartAt);
        var endAtUtc = AsUtc(request.EndAt);

        var voucher = new Voucher
        {
            Code = code,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            StartAt = startAtUtc,
            EndAt = endAtUtc,
            UsageLimit = request.UsageLimit
        };

        db.Vouchers.Add(voucher);
        await db.SaveChangesAsync(ct);

        var details = Describe(voucher);
        await audit.LogAsync(this, $"Tạo voucher {voucher.Code}", AuditActionType.Create,
            $"VOUCHER-{voucher.Id}", ct, details: details);

        var now = DateTime.UtcNow;
        return CreatedAtAction(nameof(GetById), new { id = voucher.Id }, ToDto(voucher, 0, now));
    }

    /// <summary>
    /// SCRUM-66 & SCRUM-67: Cập nhật voucher. Chặn trùng mã với voucher khác.
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<VoucherDto>> Update(long id, VoucherRequest request, CancellationToken ct)
    {
        var voucher = await db.Vouchers
            .Include(v => v.Bookings)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (voucher is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Không tìm thấy voucher",
                Detail = $"Voucher có ID {id} không tồn tại để cập nhật."
            });
        }

        var code = request.Code.Trim().ToUpperInvariant();

        // SCRUM-67: Chặn trùng mã với voucher khác
        if (await db.Vouchers.AnyAsync(v => v.Id != id && v.Code == code, ct))
        {
            return Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Trùng mã voucher",
                Detail = $"Mã voucher '{code}' đã được sử dụng bởi voucher khác trong hệ thống."
            });
        }

        var before = Describe(voucher);

        voucher.Code = code;
        voucher.DiscountType = request.DiscountType;
        voucher.DiscountValue = request.DiscountValue;
        voucher.StartAt = AsUtc(request.StartAt);
        voucher.EndAt = AsUtc(request.EndAt);
        voucher.UsageLimit = request.UsageLimit;

        await db.SaveChangesAsync(ct);

        var after = Describe(voucher);
        await audit.LogAsync(this, $"Cập nhật voucher {voucher.Code}", AuditActionType.Update,
            $"VOUCHER-{id}", ct, details: $"Trước: {before}; Sau: {after}");

        var now = DateTime.UtcNow;
        var usedCount = voucher.Bookings.Count(b => b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.HoldExpiresAt > now));
        return Ok(ToDto(voucher, usedCount, now));
    }

    /// <summary>
    /// SCRUM-66: Xóa voucher. Nếu đã có vé đặt thành công áp dụng mã này thì chặn xóa để đảm bảo toàn vẹn dữ liệu.
    /// </summary>
    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var voucher = await db.Vouchers
            .Include(v => v.Bookings)
            .FirstOrDefaultAsync(v => v.Id == id, ct);

        if (voucher is null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Không tìm thấy voucher",
                Detail = $"Voucher có ID {id} không tồn tại để xóa."
            });
        }

        var nowUtc = DateTime.UtcNow;
        var confirmedCount = voucher.Bookings.Count(b => b.Status == BookingStatus.Confirmed);
        var activePendingCount = voucher.Bookings.Count(b => b.Status == BookingStatus.Pending && b.HoldExpiresAt > nowUtc);

        if (confirmedCount > 0 || activePendingCount > 0)
        {
            var msg = confirmedCount > 0
                ? $"Không thể xóa voucher '{voucher.Code}' vì đã có {confirmedCount} lượt đặt vé đã thanh toán sử dụng mã này."
                : $"Không thể xóa voucher '{voucher.Code}' vì đang có {activePendingCount} lượt đặt vé đang giữ chỗ thanh toán sử dụng mã này.";
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Không thể xóa voucher đang có lượt dùng",
                Detail = $"{msg} Bạn có thể sửa ngày kết thúc để dừng áp dụng."
            });
        }

        var details = Describe(voucher);
        var code = voucher.Code;

        db.Vouchers.Remove(voucher);
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(this, $"Xóa voucher {code}", AuditActionType.Delete,
            $"VOUCHER-{id}", ct, details: details);

        return NoContent();
    }

    /// <summary>
    /// SCRUM-67: Kiểm tra nhanh trùng mã khi người dùng đang nhập trên giao diện.
    /// </summary>
    [HttpGet("check-code")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<CheckVoucherCodeResponse>> CheckCode(
        [FromQuery] string code,
        [FromQuery] long? excludeId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return Ok(new CheckVoucherCodeResponse(string.Empty, false, "Vui lòng nhập mã voucher."));
        }

        var normalized = code.Trim().ToUpperInvariant();
        var exists = await db.Vouchers.AnyAsync(v =>
            v.Code == normalized && (!excludeId.HasValue || v.Id != excludeId.Value), ct);

        return Ok(new CheckVoucherCodeResponse(
            normalized,
            !exists,
            exists ? $"Mã voucher '{normalized}' đã tồn tại trong hệ thống." : $"Mã voucher '{normalized}' hợp lệ và có thể sử dụng."));
    }

    /// <summary>
    /// SCRUM-67: Kiểm tra toàn diện voucher (kiểm tra tồn tại, hạn dùng và số lượt còn lại).
    /// Áp dụng cho cả khách hàng tra cứu khi đặt vé lẫn nhân viên Marketing kiểm tra thử nghiệm.
    /// </summary>
    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<ActionResult<ValidateVoucherResultDto>> Validate(
        [FromBody] ValidateVoucherRequest request,
        CancellationToken ct)
    {
        var rawCode = request.Code?.Trim() ?? string.Empty;
        var orderAmount = Math.Max(0, request.OrderAmount ?? 0);

        if (string.IsNullOrWhiteSpace(rawCode))
        {
            return Ok(new ValidateVoucherResultDto(
                false,
                "Vui lòng nhập mã voucher.",
                null,
                0,
                orderAmount));
        }

        var code = rawCode.ToUpperInvariant();
        var voucher = await db.Vouchers
            .Include(v => v.Bookings)
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Code == code, ct);

        if (voucher is null)
        {
            return Ok(new ValidateVoucherResultDto(
                false,
                $"Mã voucher '{rawCode}' không tồn tại hoặc đã bị xóa.",
                null,
                0,
                orderAmount));
        }

        var now = DateTime.UtcNow;
        var usedCount = voucher.Bookings.Count(b => b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.HoldExpiresAt > now));
        var remaining = Math.Max(0, voucher.UsageLimit - usedCount);
        var dto = ToDto(voucher, usedCount, now);

        // 1. Kiểm tra hạn dùng
        if (now < voucher.StartAt)
        {
            return Ok(new ValidateVoucherResultDto(
                false,
                $"Mã voucher '{voucher.Code}' chưa đến thời gian áp dụng (bắt đầu từ {ToVnString(voucher.StartAt)}).",
                dto,
                0,
                orderAmount));
        }

        if (now > voucher.EndAt)
        {
            return Ok(new ValidateVoucherResultDto(
                false,
                $"Mã voucher '{voucher.Code}' đã hết hạn sử dụng vào lúc {ToVnString(voucher.EndAt)}.",
                dto,
                0,
                orderAmount));
        }

        // 2. Kiểm tra số lượt còn lại
        if (voucher.UsageLimit > 0 && remaining <= 0)
        {
            return Ok(new ValidateVoucherResultDto(
                false,
                $"Mã voucher '{voucher.Code}' đã hết số lượt sử dụng tối đa ({voucher.UsageLimit}/{voucher.UsageLimit} lượt).",
                dto,
                0,
                orderAmount));
        }

        // 3. Tính toán mức giảm giá
        decimal discountAmount = 0;
        if (orderAmount > 0)
        {
            if (voucher.DiscountType == DiscountType.Percent)
            {
                discountAmount = Math.Round(orderAmount * (voucher.DiscountValue / 100m));
            }
            else
            {
                discountAmount = Math.Min(orderAmount, voucher.DiscountValue);
            }
        }

        var finalAmount = Math.Max(0, orderAmount - discountAmount);
        var discountDesc = voucher.DiscountType == DiscountType.Percent
            ? $"{voucher.DiscountValue:0.##}%"
            : $"{voucher.DiscountValue:N0} đ";

        return Ok(new ValidateVoucherResultDto(
            true,
            $"Áp dụng mã giảm giá '{voucher.Code}' thành công! (Giảm {discountDesc}, còn lại {remaining} lượt)",
            dto,
            discountAmount,
            finalAmount));
    }

    private static VoucherDto ToDto(Voucher v, int usedCount, DateTime now)
    {
        var remaining = Math.Max(0, v.UsageLimit - usedCount);
        var status = CalculateStatus(v.StartAt, v.EndAt, v.UsageLimit, usedCount, now);
        var isActive = status == "ACTIVE";

        return new VoucherDto(
            v.Id,
            v.Code,
            v.DiscountType,
            v.DiscountValue,
            v.StartAt,
            v.EndAt,
            v.UsageLimit,
            usedCount,
            remaining,
            isActive,
            status);
    }

    private static string CalculateStatus(DateTime startUtc, DateTime endUtc, int limit, int used, DateTime now)
    {
        if (now < startUtc) return "UPCOMING";
        if (now > endUtc) return "EXPIRED";
        if (limit > 0 && used >= limit) return "OUT_OF_STOCK";
        return "ACTIVE";
    }

    private static string Describe(Voucher v) =>
        $"Mã: {v.Code}; Loại: {v.DiscountType}; Mức giảm: {v.DiscountValue:N2}; " +
        $"Hiệu lực: {ToVnString(v.StartAt)} đến {ToVnString(v.EndAt)}; Giới hạn: {v.UsageLimit}";

    private static DateTime AsUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private static string ToVnString(DateTime utc)
    {
        var vnTime = TimeZoneInfo.ConvertTimeFromUtc(AsUtc(utc), VnTimeZone);
        return vnTime.ToString("dd/MM/yyyy HH:mm");
    }

    private static TimeZoneInfo GetVnTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); } catch { }
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"); } catch { }
        return TimeZoneInfo.CreateCustomTimeZone("VN_UTC7", TimeSpan.FromHours(7), "VN", "VN");
    }
}
