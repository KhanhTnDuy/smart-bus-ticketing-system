using System.Globalization;
using System.Net;
using System.Text;

namespace SmartBusTicketing.Api.Services.Email;

public sealed record InvoiceEmailModel(
    string InvoiceNo,
    string PassengerName,
    string BookingCode,
    string RouteCode,
    string RouteName,
    DateTime DepartureAtUtc,
    IReadOnlyList<string> Seats,
    string MethodLabel,
    decimal Total,
    DateTime? PaidAtUtc,
    string TicketsUrl);

/// <summary>Dựng nội dung email hóa đơn điện tử. Mọi chuỗi từ người dùng đều được HTML-encode để không chèn được mã.</summary>
public static class InvoiceEmailBuilder
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");

    public static string FormatVnd(decimal amount) => $"{Math.Round(amount, 0).ToString("N0", Vi)} đ";

    private static string FormatVn(DateTime utc) =>
        (DateTime.SpecifyKind(utc, DateTimeKind.Utc) + VietnamOffset).ToString("HH:mm dd/MM/yyyy", Vi);

    public static string Subject(InvoiceEmailModel m) => $"Hóa đơn điện tử {m.InvoiceNo} - Smart Bus";

    public static string Html(InvoiceEmailModel m)
    {
        static string E(string s) => WebUtility.HtmlEncode(s);

        var rows = new (string Label, string Value)[]
        {
            ("Số hóa đơn", m.InvoiceNo),
            ("Mã đặt chỗ", m.BookingCode),
            ("Tuyến", $"{m.RouteCode} · {m.RouteName}"),
            ("Giờ khởi hành", FormatVn(m.DepartureAtUtc)),
            ("Ghế", m.Seats.Count > 0 ? string.Join(", ", m.Seats) : "-"),
            ("Phương thức", m.MethodLabel),
            ("Thời gian thanh toán", m.PaidAtUtc is { } paid ? FormatVn(paid) : "-"),
        };

        var sb = new StringBuilder();
        sb.Append("<div style=\"font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a\">");
        sb.Append("<h2 style=\"margin:0 0 4px;color:#1e3a8a\">Hóa đơn điện tử</h2>");
        sb.Append($"<p style=\"margin:0 0 16px;color:#475569\">Xin chào <strong>{E(m.PassengerName)}</strong>, cảm ơn bạn đã đặt vé tại Smart Bus.</p>");
        sb.Append("<table style=\"width:100%;border-collapse:collapse;font-size:14px\">");
        foreach (var (label, value) in rows)
        {
            sb.Append("<tr>");
            sb.Append($"<td style=\"padding:8px 0;border-bottom:1px solid #e2e8f0;color:#64748b\">{E(label)}</td>");
            sb.Append($"<td style=\"padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600\">{E(value)}</td>");
            sb.Append("</tr>");
        }
        sb.Append("<tr>");
        sb.Append("<td style=\"padding:12px 0;font-weight:700\">Tổng thanh toán</td>");
        sb.Append($"<td style=\"padding:12px 0;text-align:right;font-weight:800;font-size:18px;color:#047857\">{E(FormatVnd(m.Total))}</td>");
        sb.Append("</tr></table>");
        sb.Append($"<p style=\"margin:20px 0 8px\"><a href=\"{E(m.TicketsUrl)}\" style=\"background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600\">Xem vé điện tử và mã QR</a></p>");
        sb.Append("<p style=\"margin:16px 0 0;font-size:12px;color:#94a3b8\">Email này được gửi tự động, vui lòng không trả lời. Mã QR lên xe chỉ có trong mục Vé điện tử của tài khoản bạn.</p>");
        sb.Append("</div>");
        return sb.ToString();
    }
}
