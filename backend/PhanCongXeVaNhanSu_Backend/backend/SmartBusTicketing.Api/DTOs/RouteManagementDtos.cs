using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

public sealed class PagedResponse<T>
{
    public IReadOnlyList<T> Data { get; init; } = [];
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int Total { get; init; }
}

// ---------- Tuyến đường ----------

public sealed class RouteDto
{
    public long Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string StartPoint { get; init; } = string.Empty;
    public string EndPoint { get; init; } = string.Empty;
    public decimal DistanceKm { get; init; }
    public bool Active { get; init; }
    public int StopCount { get; init; }
}

public sealed class RouteRequest
{
    [Required, StringLength(20)] public string Code { get; init; } = string.Empty;
    [Required, StringLength(150)] public string Name { get; init; } = string.Empty;
    [Required, StringLength(150)] public string StartPoint { get; init; } = string.Empty;
    [Required, StringLength(150)] public string EndPoint { get; init; } = string.Empty;
    [Range(0.01, 9999)] public decimal DistanceKm { get; init; }
    public bool Active { get; init; } = true;
}

// ---------- Trạm dừng ----------

public sealed class StopDto
{
    public long Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public decimal Latitude { get; init; }
    public decimal Longitude { get; init; }
}

public sealed class StopRequest
{
    [Required, StringLength(150)] public string Name { get; init; } = string.Empty;
    [Range(-90, 90)] public decimal Latitude { get; init; }
    [Range(-180, 180)] public decimal Longitude { get; init; }
}

// ---------- Trạm theo tuyến (thứ tự) ----------

public sealed class RouteStopDto
{
    public long StopId { get; init; }
    public string StopName { get; init; } = string.Empty;
    public decimal Latitude { get; init; }
    public decimal Longitude { get; init; }
    public int StopOrder { get; init; }
    public int MinutesFromStart { get; init; }
}

public sealed class RouteStopItem
{
    public long StopId { get; init; }
    [Range(0, 1440)] public int MinutesFromStart { get; init; }
}

/// <summary>Danh sách trạm của tuyến theo đúng thứ tự dừng (phần tử đầu = StopOrder 1).</summary>
public sealed class ReplaceRouteStopsRequest
{
    [Required, MinLength(2)] public List<RouteStopItem> Stops { get; init; } = [];
}

// ---------- Đối tượng hành khách ----------

/// <summary>Danh mục đối tượng hành khách, để client chọn PassengerTypeId khi thiết lập giá vé.</summary>
public sealed class PassengerTypeDto
{
    public int Id { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public decimal DiscountPercent { get; init; }
}

// ---------- Giá vé ----------

public sealed class FareDto
{
    public long Id { get; init; }
    public long RouteId { get; init; }
    public string TicketType { get; init; } = string.Empty;
    public int PassengerTypeId { get; init; }
    public string PassengerTypeCode { get; init; } = string.Empty;
    public string PassengerTypeName { get; init; } = string.Empty;
    public decimal Price { get; init; }
    public DateOnly EffectiveFrom { get; init; }
    /// <summary>ACTIVE = bản giá mới nhất đã có hiệu lực, UPCOMING = chưa tới ngày áp dụng, EXPIRED = đã bị bản giá mới hơn thay thế.</summary>
    public string Status { get; init; } = string.Empty;
}

public sealed class FareRequest
{
    [Range(1, long.MaxValue)] public long RouteId { get; init; }
    [Required] public string TicketType { get; init; } = "Single";
    [Range(1, int.MaxValue)] public int PassengerTypeId { get; init; }
    [Range(0.01, 100000000)] public decimal Price { get; init; }
    public DateOnly EffectiveFrom { get; init; }
}
