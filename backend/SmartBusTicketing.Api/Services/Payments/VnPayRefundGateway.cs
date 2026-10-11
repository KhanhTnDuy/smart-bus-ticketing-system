using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace SmartBusTicketing.Api.Services.Payments;

/// <summary>Yêu cầu hoàn tiền gửi VNPay. RequestId phải ổn định giữa các lần thử để VNPay nhận ra yêu cầu trùng.</summary>
public sealed record VnPayRefundRequest(
    string RequestId,
    string TxnRef,
    decimal Amount,
    bool FullRefund,
    string TransactionNo,
    string TransactionDate,
    string OrderInfo,
    string CreatedBy);

public sealed record VnPayRefundResponse(
    string ResponseCode,
    string Message,
    string? TransactionNo,
    bool SignatureValid);

public interface IVnPayRefundGateway
{
    /// <summary>Gọi API hoàn tiền của VNPay. Ném HttpRequestException/TaskCanceledException khi lỗi mạng hoặc hết thời gian chờ.</summary>
    Task<VnPayRefundResponse> RefundAsync(VnPayRefundRequest request, CancellationToken ct);
}

/// <summary>
/// Gọi API hoàn tiền VNPay (merchant_webapi, command "refund"). Mã phản hồi "00" mới là thành công và chỉ tin khi
/// chữ ký phản hồi đúng.
/// </summary>
public sealed class VnPayRefundGateway(HttpClient http, VnPayClient client, IOptions<VnPayOptions> options) : IVnPayRefundGateway
{
    public async Task<VnPayRefundResponse> RefundAsync(VnPayRefundRequest request, CancellationToken ct)
    {
        var body = client.BuildRefundBody(
            request.RequestId, request.FullRefund ? "02" : "03", request.TxnRef, request.Amount,
            request.TransactionNo, request.TransactionDate, request.CreatedBy, request.OrderInfo, "127.0.0.1", DateTime.UtcNow);

        using var response = await http.PostAsJsonAsync(options.Value.RefundUrl, body, ct);
        response.EnsureSuccessStatusCode();

        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
        var fields = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var p in doc.RootElement.EnumerateObject())
        {
            fields[p.Name] = p.Value.ValueKind == JsonValueKind.String ? p.Value.GetString() ?? "" : p.Value.GetRawText();
        }

        fields.TryGetValue("vnp_ResponseCode", out var code);
        fields.TryGetValue("vnp_Message", out var message);
        fields.TryGetValue("vnp_TransactionNo", out var txNo);
        return new VnPayRefundResponse(code ?? "", message ?? "", string.IsNullOrEmpty(txNo) ? null : txNo, client.VerifyRefundResponse(fields));
    }
}
