using Microsoft.Extensions.Options;

namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>
/// Bộ giả lập thanh toán cho các phương thức chưa nối cổng thật (MoMo, ZaloPay...): chốt giao dịch ngay mà không
/// gọi ngân hàng. Chỉ dùng trên máy dev. Ngoài môi trường Development thì luôn tắt, kể cả khi ai đó đặt
/// Payments__Simulator__Enabled=true, và máy chủ từ chối khởi động để lỗi cấu hình lộ ra ngay thay vì âm thầm
/// cho qua các giao dịch chưa trả tiền.
/// </summary>
public sealed class PaymentSimulatorOptions
{
    public const string Section = "Payments:Simulator";

    public bool Enabled { get; set; }
}

public sealed class PaymentSimulator(IOptions<PaymentSimulatorOptions> options, IHostEnvironment environment)
{
    private readonly bool configured = options.Value.Enabled;

    /// <summary>True khi được phép thanh toán giả lập: bật trong cấu hình VÀ đang chạy ở Development.</summary>
    public bool IsEnabled { get; } = options.Value.Enabled && environment.IsDevelopment();

    /// <summary>Cấu hình bật giả lập nhưng môi trường không phải Development: sai cấu hình, phải dừng khởi động.</summary>
    public bool IsMisconfigured => configured && !IsEnabled;

    public const string MisconfiguredMessage =
        "Payments:Simulator:Enabled đang bật ngoài môi trường Development. Bộ giả lập chốt giao dịch mà không thu tiền, " +
        "không được bật ở môi trường thật: bỏ biến môi trường Payments__Simulator__Enabled hoặc đặt về false.";
}
