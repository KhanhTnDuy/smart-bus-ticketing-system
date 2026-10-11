using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.Extensions.Options;

namespace SmartBusTicketing.Api.Services.Email;

/// <summary>
/// Cấu hình gửi email qua SMTP. Mật khẩu KHÔNG đặt vào file trong git: dùng biến môi trường Email__Password hoặc
/// dotnet user-secrets. Với Gmail: bật xác minh 2 bước rồi tạo "mật khẩu ứng dụng" (App password), host
/// smtp.gmail.com, cổng 587, UseSsl = true.
/// </summary>
public sealed class EmailOptions
{
    public const string Section = "Email";

    /// <summary>Tắt thì hệ thống vẫn tạo hóa đơn nhưng không gửi mail; hóa đơn chờ gửi cho tới khi bật.</summary>
    public bool Enabled { get; set; }

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool UseSsl { get; set; } = true;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "Smart Bus";

    /// <summary>Địa chỉ trang web, dùng để đặt liên kết "Xem vé điện tử" trong email.</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:5173";

    public bool IsConfigured =>
        Enabled && !string.IsNullOrWhiteSpace(Host) && !string.IsNullOrWhiteSpace(FromAddress);
}

public interface IEmailSender
{
    /// <summary>False khi chưa bật hoặc thiếu Host/FromAddress: bên gọi không nên thử gửi và không tính là lần thất bại.</summary>
    bool IsConfigured { get; }

    Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct);
}

/// <summary>Gửi email bằng System.Net.Mail. STARTTLS dùng khi UseSsl = true (cổng 587), không cần thư viện ngoài.</summary>
public sealed class SmtpEmailSender(IOptions<EmailOptions> options) : IEmailSender
{
    public bool IsConfigured => options.Value.IsConfigured;

    public async Task SendAsync(string to, string subject, string htmlBody, CancellationToken ct)
    {
        var opt = options.Value;
        if (!opt.IsConfigured) throw new InvalidOperationException("Chưa cấu hình gửi email (mục Email trong cấu hình).");

        using var client = new SmtpClient(opt.Host, opt.Port)
        {
            EnableSsl = opt.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Timeout = 20_000,
        };
        if (!string.IsNullOrWhiteSpace(opt.User)) client.Credentials = new NetworkCredential(opt.User, opt.Password);

        using var message = new MailMessage
        {
            From = new MailAddress(opt.FromAddress, opt.FromName, Encoding.UTF8),
            Subject = subject,
            SubjectEncoding = Encoding.UTF8,
            Body = htmlBody,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(to));
        await client.SendMailAsync(message, ct);
    }
}
