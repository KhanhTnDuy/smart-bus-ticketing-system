using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

public sealed class VoucherRequest : IValidatableObject
{
    [Required, StringLength(50, MinimumLength = 3)]
    public string Code { get; init; } = string.Empty;

    public DiscountType DiscountType { get; init; }

    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal DiscountValue { get; init; }

    public DateTime StartAt { get; init; }
    public DateTime EndAt { get; init; }

    [Range(1, int.MaxValue)]
    public int UsageLimit { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!Enum.IsDefined(DiscountType))
            yield return new ValidationResult("Loại giảm giá không hợp lệ.", [nameof(DiscountType)]);
        if (DiscountType == DiscountType.Percent && DiscountValue > 100)
            yield return new ValidationResult("Mức giảm theo phần trăm phải từ 0.01 đến 100.", [nameof(DiscountValue)]);
        if (StartAt >= EndAt)
            yield return new ValidationResult("Thời điểm kết thúc phải sau thời điểm bắt đầu.", [nameof(EndAt)]);
    }
}

public sealed record VoucherDto(
    long Id,
    string Code,
    DiscountType DiscountType,
    decimal DiscountValue,
    DateTime StartAt,
    DateTime EndAt,
    int UsageLimit,
    int UsedCount);
