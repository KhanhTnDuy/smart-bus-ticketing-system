using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>
/// Cấu hình cổng VNPay (https://sandbox.vnpayment.vn/apis/). TmnCode và HashSecret do VNPay cấp khi đăng ký
/// merchant sandbox. KHÔNG đặt hai giá trị này vào file trong git: dùng biến môi trường
/// Payments__VnPay__TmnCode, Payments__VnPay__HashSecret hoặc dotnet user-secrets.
/// </summary>
public sealed class VnPayOptions
{
    public const string Section = "Payments:VnPay";

    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string PayUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    /// <summary>Trang frontend VNPay đưa khách quay lại sau khi thanh toán.</summary>
    public string ReturnUrl { get; set; } = "http://localhost:5173/passenger/payment-result";

    /// <summary>
    /// Tiền tố mã giao dịch. Nhiều máy dev dùng chung một TmnCode sandbox, mà VNPay bắt mã giao dịch phải
    /// duy nhất theo TmnCode, nên mỗi máy nên đặt một tiền tố riêng để khỏi trùng.
    /// </summary>
    public string TxnRefPrefix { get; set; } = "SB";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(TmnCode) && !string.IsNullOrWhiteSpace(HashSecret);
}

/// <summary>Kết quả đọc một lời gọi từ VNPay (ReturnUrl hoặc IPN) sau khi đã kiểm chữ ký.</summary>
public sealed record VnPayCallback(
    string TxnRef,
    decimal Amount,
    string ResponseCode,
    string TransactionStatus,
    string? TransactionNo,
    string? PayDate)
{
    public bool IsSuccess => ResponseCode == "00" && TransactionStatus == "00";
}

/// <summary>
/// Tạo URL thanh toán và kiểm chữ ký theo VNPay API 2.1.0. Chỉ làm việc với chuỗi và khóa, không gọi mạng và
/// không đụng cơ sở dữ liệu, để kiểm thử được độc lập.
/// </summary>
public sealed class VnPayClient(IOptions<VnPayOptions> options)
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public VnPayOptions Options => options.Value;

    /// <summary>Định dạng thời điểm theo yêu cầu VNPay: yyyyMMddHHmmss, giờ Việt Nam (GMT+7).</summary>
    public static string FormatVnTime(DateTime utc) =>
        (DateTime.SpecifyKind(utc, DateTimeKind.Utc) + VietnamOffset).ToString("yyyyMMddHHmmss");

    public string BuildPaymentUrl(string txnRef, decimal amountVnd, string orderInfo, string ipAddress,
        DateTime createdUtc, DateTime expireUtc)
    {
        var opt = options.Value;
        var query = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = opt.TmnCode,
            // VNPay tính tiền theo đơn vị nhỏ nhất: nhân 100.
            ["vnp_Amount"] = ((long)Math.Round(amountVnd, 0, MidpointRounding.AwayFromZero) * 100).ToString(),
            ["vnp_CreateDate"] = FormatVnTime(createdUtc),
            ["vnp_CurrCode"] = "VND",
            ["vnp_IpAddr"] = ipAddress,
            ["vnp_Locale"] = "vn",
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_OrderType"] = "other",
            ["vnp_ReturnUrl"] = opt.ReturnUrl,
            ["vnp_TxnRef"] = txnRef,
            ["vnp_ExpireDate"] = FormatVnTime(expireUtc),
        };

        var data = Canonicalize(query);
        return $"{opt.PayUrl}?{data}&vnp_SecureHash={Sign(data)}";
    }

    /// <summary>
    /// Kiểm chữ ký của một lời gọi từ VNPay. Trả về null nếu chữ ký sai hoặc thiếu trường bắt buộc, khi đó
    /// nội dung lời gọi không được tin.
    /// </summary>
    public VnPayCallback? ParseCallback(IReadOnlyDictionary<string, string> query)
    {
        if (!query.TryGetValue("vnp_SecureHash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
            return null;

        var signed = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, value) in query)
        {
            if (!key.StartsWith("vnp_", StringComparison.Ordinal)) continue;
            if (key is "vnp_SecureHash" or "vnp_SecureHashType") continue;
            if (string.IsNullOrEmpty(value)) continue;
            signed[key] = value;
        }

        var expected = Sign(Canonicalize(signed));
        var a = Encoding.ASCII.GetBytes(expected);
        var b = Encoding.ASCII.GetBytes(receivedHash.Trim().ToLowerInvariant());
        if (a.Length != b.Length || !CryptographicOperations.FixedTimeEquals(a, b)) return null;

        if (!signed.TryGetValue("vnp_TxnRef", out var txnRef) ||
            !signed.TryGetValue("vnp_Amount", out var rawAmount) ||
            !long.TryParse(rawAmount, out var amountMinor) ||
            !signed.TryGetValue("vnp_ResponseCode", out var responseCode))
            return null;

        signed.TryGetValue("vnp_TransactionStatus", out var txStatus);
        signed.TryGetValue("vnp_TransactionNo", out var txNo);
        signed.TryGetValue("vnp_PayDate", out var payDate);

        // IPN luôn có vnp_TransactionStatus; thiếu thì coi như theo ResponseCode để ReturnUrl cũ vẫn đọc được.
        return new VnPayCallback(txnRef, amountMinor / 100m, responseCode, txStatus ?? responseCode, txNo, payDate);
    }

    /// <summary>Nối key=value đã URL-encode theo thứ tự khóa tăng dần, bỏ giá trị rỗng: đúng chuỗi VNPay ký.</summary>
    private static string Canonicalize(SortedDictionary<string, string> query) =>
        string.Join('&', query
            .Where(kv => !string.IsNullOrEmpty(kv.Value))
            .Select(kv => $"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(kv.Value)}"));

    private string Sign(string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(options.Value.HashSecret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(data))).ToLowerInvariant();
    }

    /// <summary>Diễn giải mã lỗi VNPay (vnp_ResponseCode) thành câu tiếng Việt cho người dùng.</summary>
    public static string DescribeResponseCode(string code) => code switch
    {
        "00" => "Giao dịch thành công.",
        "07" => "Giao dịch bị nghi ngờ gian lận hoặc bất thường.",
        "09" => "Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking.",
        "10" => "Xác thực thông tin thẻ/tài khoản quá 3 lần.",
        "11" => "Đã hết thời gian chờ thanh toán.",
        "12" => "Thẻ/tài khoản bị khóa.",
        "13" => "Sai mật khẩu xác thực giao dịch (OTP).",
        "24" => "Bạn đã hủy giao dịch.",
        "51" => "Tài khoản không đủ số dư.",
        "65" => "Tài khoản vượt hạn mức giao dịch trong ngày.",
        "75" => "Ngân hàng thanh toán đang bảo trì.",
        "79" => "Nhập sai mật khẩu thanh toán quá số lần quy định.",
        _ => $"Thanh toán không thành công (mã {code}).",
    };
}
