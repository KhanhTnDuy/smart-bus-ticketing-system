using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public sealed class SubmitDiscountApplicationRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Vui lòng chọn đối tượng ưu đãi.")]
    public int PassengerTypeId { get; init; }

    /// <summary>Đường dẫn giấy tờ minh chứng, lấy từ kết quả của POST /api/uploads.</summary>
    [Required(ErrorMessage = "Vui lòng tải lên giấy tờ minh chứng."), StringLength(300)]
    public string DocumentUrl { get; init; } = string.Empty;
}

public sealed class ReviewDiscountApplicationRequest
{
    public bool Approve { get; init; }

    /// <summary>Ngày hết hạn ưu đãi (yyyy-MM-dd). Bỏ trống thì mặc định 1 năm kể từ hôm nay. Chỉ dùng khi duyệt.</summary>
    public DateOnly? ValidUntil { get; init; }

    /// <summary>Bắt buộc khi từ chối.</summary>
    [StringLength(1000)]
    public string? RejectReason { get; init; }
}

public sealed class DiscountApplicationDto
{
    public long Id { get; init; }
    public long PassengerId { get; init; }
    public string PassengerName { get; init; } = string.Empty;
    public string? PassengerEmail { get; init; }
    public string? PassengerPhone { get; init; }
    public int PassengerTypeId { get; init; }
    public string PassengerTypeCode { get; init; } = string.Empty;
    public string PassengerTypeName { get; init; } = string.Empty;
    public decimal DiscountPercent { get; init; }
    public string DocumentUrl { get; init; } = string.Empty;
    /// <summary>Pending, Approved hoặc Rejected.</summary>
    public string Status { get; init; } = string.Empty;
    public DateTime SubmittedAt { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewedByName { get; init; }
    public DateOnly? ValidUntil { get; init; }
    public string? RejectReason { get; init; }
}

public sealed class UploadResultDto
{
    public string Url { get; init; } = string.Empty;
    public string FileName { get; init; } = string.Empty;
    public long Size { get; init; }
}
