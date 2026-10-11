namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>
/// Một bậc chính sách hoàn tiền: hủy vé khi còn ít nhất <see cref="HoursBefore"/> giờ trước giờ khởi hành thì hoàn
/// <see cref="Percent"/>% tiền vé.
/// </summary>
public sealed class RefundTier
{
    public int HoursBefore { get; set; }
    public int Percent { get; set; }
}

/// <summary>
/// Cấu hình hoàn tiền (mục "Refunds"). Mặc định hoàn 100% và tự xử lý qua cổng; đặt <see cref="Tiers"/> để hoàn theo giờ
/// trước chuyến, ví dụ [24h: 100%, 2h: 50%] (dưới 2 giờ không hoàn).
/// </summary>
public sealed class RefundOptions
{
    public const string Section = "Refunds";

    /// <summary>Tự gọi cổng hoàn tiền cho các khoản hoàn của giao dịch VNPay. Tắt thì quản lý duyệt tay từng khoản.</summary>
    public bool AutoProcess { get; set; } = true;

    /// <summary>Chính sách hoàn theo giờ, chỉ áp cho hủy vé của khách. Rỗng nghĩa là luôn hoàn 100%.</summary>
    public List<RefundTier> Tiers { get; set; } = [];
}

public static class RefundPolicy
{
    /// <summary>
    /// Phần trăm được hoàn khi hủy còn <paramref name="hoursBeforeDeparture"/> giờ trước giờ chạy. Không có bậc nào
    /// (cấu hình rỗng) thì hoàn 100%; có bậc mà còn ít giờ hơn bậc thấp nhất thì không hoàn (0%).
    /// </summary>
    public static int PercentFor(double hoursBeforeDeparture, IReadOnlyCollection<RefundTier>? tiers)
    {
        if (tiers is null || tiers.Count == 0) return 100;

        var tier = tiers
            .Where(t => t.HoursBefore <= hoursBeforeDeparture)
            .OrderByDescending(t => t.HoursBefore)
            .FirstOrDefault();
        return tier is null ? 0 : Math.Clamp(tier.Percent, 0, 100);
    }
}
