using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

/// <summary>
/// SCRUM-66: DTO yêu cầu tạo/cập nhật thông tin voucher.
/// </summary>
public sealed class VoucherRequest : IValidatableObject
{
    [Required(ErrorMessage = "Mã voucher không được để trống.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "Mã voucher phải từ 3 đến 50 ký tự.")]
    [RegularExpression(@"^[a-zA-Z0-9_\-]+$", ErrorMessage = "Mã voucher chỉ được chứa chữ cái, số, dấu gạch ngang (-) và gạch dưới (_).")]
    public string Code { get; init; } = string.Empty;

    public DiscountType DiscountType { get; init; }

    [Range(typeof(decimal), "0.01", "99999999.99", ErrorMessage = "Mức giảm giá phải lớn hơn 0.")]
    public decimal DiscountValue { get; init; }

    [Required(ErrorMessage = "Ngày bắt đầu không được để trống.")]
    public DateTime StartAt { get; init; }

    [Required(ErrorMessage = "Ngày kết thúc không được để trống.")]
    public DateTime EndAt { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "Số lượt dùng tối đa phải từ 1 trở lên.")]
    public int UsageLimit { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!Enum.IsDefined(DiscountType))
            yield return new ValidationResult("Loại giảm giá không hợp lệ (chỉ chấp nhận Percent hoặc Fixed).", [nameof(DiscountType)]);

        if (DiscountType == DiscountType.Percent && DiscountValue > 100)
            yield return new ValidationResult("Mức giảm theo phần trăm phải từ 0.01% đến 100%.", [nameof(DiscountValue)]);

        if (StartAt >= EndAt)
            yield return new ValidationResult("Thời điểm kết thúc phải sau thời điểm bắt đầu.", [nameof(EndAt)]);
    }
}

/// <summary>
/// SCRUM-66 & SCRUM-67: DTO phản hồi chi tiết voucher kèm số lượt dùng và trạng thái hiệu lực.
/// </summary>
public sealed record VoucherDto(
    long Id,
    string Code,
    DiscountType DiscountType,
    decimal DiscountValue,
    DateTime StartAt,
    DateTime EndAt,
    int UsageLimit,
    int UsedCount,
    int RemainingCount,
    bool IsActive,
    string Status);

/// <summary>
/// SCRUM-67: Yêu cầu kiểm tra voucher.
/// </summary>
public sealed class ValidateVoucherRequest
{
    [Required(ErrorMessage = "Vui lòng nhập mã voucher.")]
    public string Code { get; init; } = string.Empty;

    [Range(0, double.MaxValue, ErrorMessage = "Số tiền đơn hàng không hợp lệ.")]
    public decimal? OrderAmount { get; init; }
}

/// <summary>
/// SCRUM-67: Kết quả kiểm tra voucher (hạn dùng, số lượt còn lại, mức giảm giá).
/// </summary>
public sealed record ValidateVoucherResultDto(
    bool IsValid,
    string Message,
    VoucherDto? Voucher,
    decimal DiscountAmount,
    decimal FinalAmount);

/// <summary>
/// SCRUM-67: Kết quả kiểm tra trùng mã voucher.
/// </summary>
public sealed record CheckVoucherCodeResponse(
    string Code,
    bool IsAvailable,
    string Message);
