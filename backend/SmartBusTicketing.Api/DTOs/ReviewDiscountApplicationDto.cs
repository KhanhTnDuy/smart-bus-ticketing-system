namespace SmartBusTicketing.Api.DTOs;

public class ReviewDiscountApplicationDto
{
    public bool IsApproved { get; set; }
    public string? RejectionReason { get; set; }
    public DateTime? ExpiresAt { get; set; }
}