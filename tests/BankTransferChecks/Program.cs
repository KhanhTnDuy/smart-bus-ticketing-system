using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using SmartBusTicketing.Api.Controllers;
using SmartBusTicketing.Api.Services.Payments;

var checks = 0;
void Check(bool condition, string name)
{
    if (!condition) throw new Exception(name);
    Console.WriteLine($"PASS {name}");
    checks++;
}

BankTransferOptions Config() => new()
{
    BankId = "MB", AccountNumber = "0123456789", AccountName = "NGUYEN VAN TEST", WebhookApiKey = "test-key"
};
var bank = Config();
Check(bank.IsConfigured, "Valid recipient configuration");
foreach (var field in new[] { "BankId", "AccountNumber", "AccountName", "MemoPrefix", "QrTemplate" })
{
    var invalid = Config();
    typeof(BankTransferOptions).GetProperty(field)!.SetValue(invalid, "");
    Check(!invalid.IsConfigured, $"Reject missing {field}");
}
foreach (var prefix in new[] { "SB V", "!!!", "123", new string('S', 13) })
{
    bank.MemoPrefix = prefix;
    Check(!bank.IsConfigured, $"Reject invalid prefix {prefix}");
}
bank = Config();
var memo = BankTransferHelper.NewMemo(bank.MemoPrefix);
var qr = new Uri(BankTransferHelper.QrUrl(bank, 7000, memo));
Check(qr.AbsolutePath == "/image/MB-0123456789-compact2.png", "QR recipient keeps leading zero");
Check(qr.Query.Contains("amount=7000") && qr.Query.Contains("addInfo=" + memo), "QR amount and memo");
Check(BankTransferHelper.FindMemos("SBV", memo.ToLowerInvariant().Insert(5, " "), memo).Single() == memo,
    "Normalize bank memo and deduplicate");

// Invalid callbacks must return before any database/settlement access. Null dependencies make accidental access fail.
async Task<IActionResult> Callback(Dictionary<string, object?> payload, string? auth = "Apikey test-key", bool enabled = true)
{
    var options = Config();
    if (!enabled) options.WebhookApiKey = "";
    var controller = new PaymentsController(null!, null!, null!, new ConfigurationBuilder().Build(), Options.Create(options), null!)
    {
        ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
    };
    if (auth != null) controller.Request.Headers.Authorization = auth;
    return await controller.BankTransferWebhook(JsonSerializer.SerializeToElement(payload), CancellationToken.None);
}
Dictionary<string, object?> Payload() => new()
{
    ["transferType"] = "in", ["accountNumber"] = "0123456789", ["transferAmount"] = 7000,
    ["id"] = 92704, ["content"] = memo
};
async Task Reject(string field, object? value, string reason)
{
    var payload = Payload();
    payload[field] = value;
    var result = await Callback(payload) as OkObjectResult;
    var body = JsonSerializer.SerializeToElement(result?.Value);
    Check(body.GetProperty("success").GetBoolean() && !body.GetProperty("matched").GetBoolean()
        && body.GetProperty("reason").GetString() == reason, $"Reject {field}={value ?? "null"}: {reason}");
}
Check(await Callback(Payload(), enabled: false) is NotFoundResult, "Webhook disabled without key");
foreach (var auth in new string?[] { null, "Apikey wrong", "Bearer test-key" })
    Check(await Callback(Payload(), auth) is UnauthorizedObjectResult, "Reject invalid authorization");
await Reject("transferType", "out", "not-incoming");
foreach (var account in new object?[] { null, "", "  " }) await Reject("accountNumber", account, "missing-account");
await Reject("accountNumber", "999999", "other-account");
foreach (var amount in new object?[] { null, 0, -7000, 7000.5m, "invalid" }) await Reject("transferAmount", amount, "bad-amount");
foreach (var id in new object?[] { null, "", 0, -1, "invalid" }) await Reject("id", id, "bad-transaction-id");
await Reject("content", "lunch", "no-memo");
Console.WriteLine($"{checks} checks passed.");
