using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace SmartBusTicketing.Api.Services.Routing;

/// <summary>
/// Cấu hình dịch vụ chỉ đường (mục "Routing"). Mặc định dùng máy chủ demo công khai của OSRM, không cần khóa API
/// nhưng chỉ nên dùng nhẹ; muốn ổn định hơn thì tự dựng OSRM hoặc trỏ BaseUrl sang dịch vụ tương thích.
/// </summary>
public sealed class RoutingOptions
{
    public const string Section = "Routing";

    /// <summary>Tắt thì mọi nơi quay về khoảng cách đường chim bay (dùng cho kiểm thử, không cần mạng).</summary>
    public bool Enabled { get; set; } = true;

    public string BaseUrl { get; set; } = "https://router.project-osrm.org";

    /// <summary>Hồ sơ phương tiện của OSRM: máy chủ demo chỉ có "driving".</summary>
    public string Profile { get; set; } = "driving";

    public int TimeoutSeconds { get; set; } = 8;
}

/// <summary>Kết quả chỉ đường qua các điểm theo thứ tự: tổng km, km từng chặng và thời gian lái xe.</summary>
public sealed record RoadRouteResult(decimal TotalKm, IReadOnlyList<decimal> LegKm, int DurationMinutes);

public interface IRoadRouteService
{
    /// <summary>
    /// Khoảng cách đi đường bộ qua các điểm (vĩ độ, kinh độ) theo đúng thứ tự. Trả null khi dịch vụ tắt, lỗi mạng,
    /// hết thời gian chờ hoặc không có đường đi, để nơi gọi tự quay về đường chim bay.
    /// </summary>
    Task<RoadRouteResult?> GetRouteAsync(IReadOnlyList<(decimal Lat, decimal Lon)> points, CancellationToken ct);
}

/// <summary>Gọi API <c>/route/v1</c> của OSRM. Không ném lỗi ra ngoài: mọi sự cố ghi log rồi trả null.</summary>
public sealed class OsrmRoadRouteService(HttpClient http, IOptions<RoutingOptions> options, ILogger<OsrmRoadRouteService> logger)
    : IRoadRouteService
{
    public async Task<RoadRouteResult?> GetRouteAsync(IReadOnlyList<(decimal Lat, decimal Lon)> points, CancellationToken ct)
    {
        var o = options.Value;
        if (!o.Enabled || points.Count < 2) return null;

        // OSRM nhận tọa độ dạng kinh độ,vĩ độ và dùng dấu chấm thập phân bất kể ngôn ngữ máy.
        var coords = string.Join(';', points.Select(p =>
            string.Create(CultureInfo.InvariantCulture, $"{p.Lon:0.######},{p.Lat:0.######}")));
        var url = $"{o.BaseUrl.TrimEnd('/')}/route/v1/{o.Profile}/{coords}?overview=false&steps=false";

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, o.TimeoutSeconds)));

            using var response = await http.GetAsync(url, timeout.Token);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("OSRM trả HTTP {Status} cho {Count} điểm.", (int)response.StatusCode, points.Count);
                return null;
            }

            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(timeout.Token), cancellationToken: timeout.Token);
            var root = doc.RootElement;
            if (!root.TryGetProperty("code", out var code) || code.GetString() != "Ok"
                || !root.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
            {
                logger.LogWarning("OSRM không tìm được đường đi: {Code}", root.TryGetProperty("code", out var c) ? c.GetString() : "?");
                return null;
            }

            var route = routes[0];
            var legs = route.GetProperty("legs").EnumerateArray()
                .Select(l => Math.Round((decimal)l.GetProperty("distance").GetDouble() / 1000m, 2, MidpointRounding.AwayFromZero))
                .ToList();
            if (legs.Count != points.Count - 1) return null;

            var totalKm = Math.Round((decimal)route.GetProperty("distance").GetDouble() / 1000m, 2, MidpointRounding.AwayFromZero);
            var minutes = (int)Math.Ceiling(route.GetProperty("duration").GetDouble() / 60.0);
            return new RoadRouteResult(totalKm, legs, minutes);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException or JsonException or KeyNotFoundException)
        {
            // Hủy do chính yêu cầu của người dùng thì để nơi gọi xử lý, còn lại là sự cố của dịch vụ ngoài.
            if (ct.IsCancellationRequested) throw;
            logger.LogWarning(ex, "Không gọi được dịch vụ chỉ đường OSRM.");
            return null;
        }
    }
}
