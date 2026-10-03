using System.ComponentModel.DataAnnotations;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.DTOs;

// ---------- SCRUM-49: Quản lý xe buýt và sơ đồ ghế ----------

public sealed class BusDto
{
    public long Id { get; init; }
    public string PlateNumber { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public BusStatus Status { get; init; }

    /// <summary>Số hàng / số cột của sơ đồ ghế, suy ra từ các ghế đã tạo (0 nếu xe chưa có ghế).</summary>
    public int Rows { get; init; }
    public int Columns { get; init; }

    public int TripCount { get; init; }
}

public sealed class BusSeatDto
{
    public long Id { get; init; }
    public string SeatCode { get; init; } = string.Empty;
    public int Row { get; init; }
    public int Column { get; init; }
}

public sealed class BusDetailDto
{
    public BusDto Bus { get; init; } = null!;
    public IReadOnlyList<BusSeatDto> Seats { get; init; } = [];
}

/// <summary>
/// Sơ đồ ghế được sinh theo hàng / cột, điền lần lượt từng hàng: số ghế = Capacity,
/// hàng cuối có thể thiếu ghế. Mã ghế dạng "A1": chữ cái là hàng, số là cột.
/// </summary>
public sealed class BusRequest
{
    [Required, StringLength(20)] public string PlateNumber { get; init; } = string.Empty;
    [Range(1, 208)] public int Capacity { get; init; }
    public BusStatus Status { get; init; } = BusStatus.Active;
    [Range(1, 26)] public int Rows { get; init; }
    [Range(1, 8)] public int Columns { get; init; }
}
