using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>
/// Thanh toán bằng chuyển khoản vào tài khoản ngân hàng của đơn vị (mục "BankTransfer"). Hệ thống tạo mã VietQR
/// kèm nội dung chuyển khoản duy nhất cho mỗi lượt thanh toán; tiền vào tài khoản thì xác nhận bằng tay (quản lý đối chiếu
/// sao kê) hoặc tự động qua webhook của dịch vụ theo dõi giao dịch ngân hàng (SePay).
///
/// Số tài khoản KHÔNG đặt vào file trong git: dùng biến môi trường BankTransfer__AccountNumber... hoặc dotnet user-secrets.
/// </summary>
public sealed class BankTransferOptions
{
    public const string Section = "BankTransfer";

    /// <summary>Mã ngân hàng theo VietQR (vd. MB, VCB, ACB, TCB, BIDV) hoặc mã BIN 6 số của ngân hàng.</summary>
    public string BankId { get; set; } = string.Empty;

    /// <summary>Tên ngân hàng hiển thị cho khách (vd. "MB Bank").</summary>
    public string BankName { get; set; } = string.Empty;

    public string AccountNumber { get; set; } = string.Empty;

    /// <summary>Tên chủ tài khoản, viết hoa không dấu như trên ngân hàng.</summary>
    public string AccountName { get; set; } = string.Empty;

    /// <summary>Tiền tố nội dung chuyển khoản. Phải khớp cấu hình nhận diện mã thanh toán ở dịch vụ webhook (SePay).</summary>
    public string MemoPrefix { get; set; } = "SBV";

    /// <summary>Kiểu ảnh VietQR: compact2 (có logo và thông tin), compact, qr_only, print.</summary>
    public string QrTemplate { get; set; } = "compact2";

    /// <summary>
    /// Khóa API cho webhook báo có tiền vào (SePay gửi trong header "Authorization: Apikey ..."). Trống thì webhook bị tắt,
    /// chỉ xác nhận bằng tay.
    /// </summary>
    public string WebhookApiKey { get; set; } = string.Empty;

    public bool IsConfigured =>
        Regex.IsMatch(BankId.Trim(), "^[A-Za-z0-9]{2,20}$")
        && Regex.IsMatch(AccountNumber.Trim(), "^[0-9]{1,34}$")
        && !string.IsNullOrWhiteSpace(AccountName)
        && Regex.IsMatch(MemoPrefix.Trim(), "^[A-Za-z][A-Za-z0-9]{1,11}$")
        && QrTemplate is "compact2" or "compact" or "qr_only" or "print";

    public bool WebhookEnabled => IsConfigured && !string.IsNullOrWhiteSpace(WebhookApiKey);
}

public static class BankTransferHelper
{
    // Bỏ các ký tự dễ nhầm (0/O, 1/I/L) vì khách có thể gõ tay nội dung chuyển khoản.
    private const string Alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 8;

    /// <summary>Nội dung chuyển khoản duy nhất, vd. SBV7K3M9Q2X: chữ in hoa và số, không dấu cách để ngân hàng không làm hỏng.</summary>
    public static string NewMemo(string prefix)
    {
        var sb = new StringBuilder(prefix.Trim().ToUpperInvariant());
        for (var i = 0; i < CodeLength; i++) sb.Append(Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)]);
        return sb.ToString();
    }

    /// <summary>Địa chỉ ảnh mã VietQR (img.vietqr.io): quét bằng app ngân hàng sẽ điền sẵn tài khoản, số tiền và nội dung.</summary>
    public static string QrUrl(BankTransferOptions o, decimal amountVnd, string memo) =>
        $"https://img.vietqr.io/image/{Uri.EscapeDataString(o.BankId.Trim())}-{Uri.EscapeDataString(o.AccountNumber.Trim())}-{Uri.EscapeDataString(o.QrTemplate)}.png" +
        $"?amount={(long)Math.Round(amountVnd, 0, MidpointRounding.AwayFromZero)}&addInfo={Uri.EscapeDataString(memo)}&accountName={Uri.EscapeDataString(o.AccountName.Trim())}";

    /// <summary>Chuẩn hóa nội dung ngân hàng trả về (hoa, chỉ chữ và số) để tìm mã dù ngân hàng chèn dấu cách hay ký tự lạ.</summary>
    public static string Normalize(string? text) =>
        string.IsNullOrEmpty(text) ? string.Empty : Regex.Replace(text.ToUpperInvariant(), "[^A-Z0-9]", string.Empty);

    /// <summary>Tìm các mã nội dung chuyển khoản (tiền tố + 8 ký tự) trong nội dung đã chuẩn hóa.</summary>
    public static IReadOnlyList<string> FindMemos(string prefix, params string?[] texts)
    {
        var p = Regex.Escape(Normalize(prefix));
        var found = new List<string>();
        foreach (var t in texts)
        {
            var normalized = Normalize(t);
            foreach (Match m in Regex.Matches(normalized, $"{p}[A-Z0-9]{{{CodeLength}}}")) found.Add(m.Value);
        }
        return found.Distinct().ToList();
    }
}
