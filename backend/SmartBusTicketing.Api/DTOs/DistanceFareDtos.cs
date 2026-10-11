using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

/// <summary>Một bậc của bảng giá niêm yết theo km: hành trình trên FromKm và không quá ToKm thì giá là Price.</summary>
public sealed class DistanceFareDto
{
    public long Id { get; init; }
    public decimal FromKm { get; init; }
    /// <summary>Rỗng nghĩa là bậc cuối, không giới hạn trên.</summary>
    public decimal? ToKm { get; init; }
    public decimal Price { get; init; }
}

public sealed class DistanceFareRequest : IValidatableObject
{
    [Range(typeof(decimal), "0", "1000", ErrorMessage = "Km bắt đầu phải từ 0 đến 1000.")]
    public decimal FromKm { get; init; }

    [Range(typeof(decimal), "0.01", "1000", ErrorMessage = "Km kết thúc phải từ 0,01 đến 1000.")]
    public decimal? ToKm { get; init; }

    [Range(typeof(decimal), "1", "99999999", ErrorMessage = "Giá vé phải lớn hơn 0.")]
    public decimal Price { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ToKm is { } to && to <= FromKm)
            yield return new ValidationResult("Km kết thúc phải lớn hơn km bắt đầu.", [nameof(ToKm)]);
    }
}

public sealed class FareStopDto
{
    public long StopId { get; init; }
    public string StopName { get; init; } = string.Empty;
    public int StopOrder { get; init; }
    public decimal? DistanceFromStartKm { get; init; }
}

/// <summary>Giá của một chặng giữa hai trạm của tuyến, theo từng đối tượng hành khách.</summary>
public sealed class FareLegDto
{
    public long FromStopId { get; init; }
    public string FromStopName { get; init; } = string.Empty;
    public long ToStopId { get; init; }
    public string ToStopName { get; init; } = string.Empty;
    public decimal DistanceKm { get; init; }
    /// <summary>Rỗng khi km của chặng không rơi vào bậc nào của bảng giá.</summary>
    public List<TripPassengerFareDto> Prices { get; init; } = [];
}

/// <summary>Bảng giá chi tiết của một tuyến: km từng trạm và giá mọi chặng (trạm lên đứng trước trạm xuống).</summary>
public sealed class RouteFareMatrixDto
{
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public decimal DistanceKm { get; init; }
    public List<FareStopDto> Stops { get; init; } = [];
    public List<FareLegDto> Legs { get; init; } = [];
}
