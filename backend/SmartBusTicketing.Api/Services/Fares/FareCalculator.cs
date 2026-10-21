using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services.Routing;

namespace SmartBusTicketing.Api.Services.Fares;

/// <summary>
/// Giá vé niêm yết theo số km hành trình. Km của một chặng là hiệu số km-từ-đầu-tuyến giữa trạm xuống và trạm lên
/// (<see cref="RouteStop.DistanceFromStartKm"/>), rồi tra bảng giá theo bậc km (<see cref="DistanceFare"/>). Hành khách thuộc đối
/// tượng ưu đãi được giảm theo <see cref="PassengerType.DiscountPercent"/>. Có bảng giá theo km thì đây là giá chính thức; chưa có
/// bảng giá, hoặc chặng chưa biết km / không rơi vào bậc nào, thì các nơi gọi quay về cách tính cũ (giá theo tuyến, rồi giá dự phòng).
/// </summary>
public static class FareCalculator
{
    /// <summary>Số km chặng từ trạm lên đến trạm xuống; null nếu thiếu dữ liệu km hoặc chiều đi sai.</summary>
    public static decimal? LegKm(RouteStop? board, RouteStop? alight)
    {
        if (board?.DistanceFromStartKm is not { } from || alight?.DistanceFromStartKm is not { } to) return null;
        var km = to - from;
        return km > 0 ? km : null;
    }

    /// <summary>
    /// Giá của bậc chứa <paramref name="km"/>. Bậc (FromKm, ToKm]: mốc đúng bằng ToKm thuộc bậc thấp hơn, vd bậc 3 đến 8 km tính cho
    /// hành trình trên 3 km và không quá 8 km. ToKm rỗng là bậc cuối, không giới hạn trên.
    /// </summary>
    public static decimal? BandPrice(IEnumerable<DistanceFare> bands, decimal? km)
    {
        if (km is not { } k) return null;
        return bands.OrderBy(b => b.FromKm).FirstOrDefault(b => k > b.FromKm && (b.ToKm is null || k <= b.ToKm))?.Price;
    }

    /// <summary>Giá sau ưu đãi, làm tròn đến đồng.</summary>
    public static decimal ApplyDiscount(decimal price, decimal discountPercent) =>
        Math.Round(price * (100 - discountPercent) / 100m, 0, MidpointRounding.AwayFromZero);
}

/// <summary>
/// Tính km từ đầu tuyến cho từng trạm. Hệ thống không lưu độ dài từng chặng, chỉ có tọa độ trạm và tổng độ dài tuyến
/// (<see cref="BusRoute.DistanceKm"/>): lấy độ dài từng chặng giữa các trạm liên tiếp rồi co giãn để tổng bằng đúng độ dài tuyến.
/// Độ dài chặng ưu tiên lấy theo đường đi bộ thực tế từ dịch vụ chỉ đường (<see cref="IRoadRouteService"/>); khi dịch vụ tắt hoặc lỗi
/// thì quay về khoảng cách đường chim bay (đường thực tế dài hơn đường chim bay theo cùng một hệ số).
/// Nếu có độ dài từng chặng chính xác hơn thì nhập thẳng vào DistanceFromStartKm.
/// </summary>
public static class RouteDistances
{
    private const double EarthRadiusKm = 6371.0088;

    /// <summary>Khoảng cách đường chim bay giữa hai tọa độ, đơn vị km.</summary>
    public static double Haversine(double lat1, double lon1, double lat2, double lon2)
    {
        static double Rad(double d) => d * Math.PI / 180.0;
        var dLat = Rad(lat2 - lat1);
        var dLon = Rad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
                + Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        return 2 * EarthRadiusKm * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    /// <summary>Km tích lũy từ trạm đầu tới từng trạm theo đường chim bay (phần tử đầu là 0, phần tử cuối là <paramref name="totalKm"/> nếu tổng &gt; 0).</summary>
    public static IReadOnlyList<decimal> Cumulative(IReadOnlyList<(decimal Lat, decimal Lon)> points, decimal totalKm)
    {
        if (points.Count < 2) return new decimal[points.Count];

        var legs = new decimal[points.Count - 1];
        for (var i = 1; i < points.Count; i++)
            legs[i - 1] = (decimal)Haversine((double)points[i - 1].Lat, (double)points[i - 1].Lon, (double)points[i].Lat, (double)points[i].Lon);
        return CumulativeFromLegs(legs, totalKm);
    }

    /// <summary>Km tích lũy từ độ dài từng chặng, co giãn để chặng cuối đúng bằng <paramref name="totalKm"/> (giữ nguyên tỉ lệ giữa các chặng).</summary>
    public static IReadOnlyList<decimal> CumulativeFromLegs(IReadOnlyList<decimal> legs, decimal totalKm)
    {
        var result = new decimal[legs.Count + 1];
        if (legs.Count == 0) return result;

        var sum = legs.Sum();
        var scale = sum > 0 && totalKm > 0 ? (double)totalKm / (double)sum : 1.0;

        double acc = 0;
        for (var i = 1; i <= legs.Count; i++)
        {
            acc += (double)legs[i - 1] * scale;
            result[i] = Math.Round((decimal)acc, 2, MidpointRounding.AwayFromZero);
        }
        // Trạm cuối đúng bằng độ dài tuyến để tránh lệch do làm tròn.
        if (sum > 0 && totalKm > 0) result[^1] = totalKm;
        return result;
    }

    /// <summary>
    /// Tính lại km cho mọi trạm của một tuyến (sau khi đổi danh sách trạm hoặc độ dài tuyến). Truyền <paramref name="road"/> để lấy độ dài
    /// chặng theo đường đi thực tế; bỏ trống hoặc dịch vụ không trả được thì dùng đường chim bay.
    /// </summary>
    public static async Task RecalculateAsync(AppDbContext db, long routeId, CancellationToken ct, IRoadRouteService? road = null)
    {
        var route = await db.BusRoutes.AsNoTracking().FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return;

        var stops = await db.RouteStops.Include(rs => rs.Stop).Where(rs => rs.RouteId == routeId).OrderBy(rs => rs.StopOrder).ToListAsync(ct);
        var points = stops.Select(s => (s.Stop.Latitude, s.Stop.Longitude)).ToList();

        var roadRoute = road is null ? null : await road.GetRouteAsync(points, ct);
        var km = roadRoute is null ? Cumulative(points, route.DistanceKm) : CumulativeFromLegs(roadRoute.LegKm, route.DistanceKm);
        for (var i = 0; i < stops.Count; i++) stops[i].DistanceFromStartKm = km[i];
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Điền km cho các tuyến còn trạm chưa có km (dữ liệu tạo trước khi có tính năng này). An toàn khi chạy nhiều lần.</summary>
    public static async Task<int> BackfillAsync(AppDbContext db, CancellationToken ct)
    {
        var routeIds = await db.RouteStops.Where(rs => rs.DistanceFromStartKm == null).Select(rs => rs.RouteId).Distinct().ToListAsync(ct);
        foreach (var id in routeIds) await RecalculateAsync(db, id, ct);
        return routeIds.Count;
    }
}
