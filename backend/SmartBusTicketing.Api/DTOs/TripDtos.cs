using System.ComponentModel.DataAnnotations;

namespace SmartBusTicketing.Api.DTOs;

/// <summary>
/// Yêu cầu tìm kiếm chuyến xe theo điểm đi, điểm đến và ngày đi.
/// </summary>
public sealed class TripSearchRequest
{
    /// <summary>Điểm đi (Tên trạm, ID trạm, hoặc Tên đầu tuyến)</summary>
    [Required(ErrorMessage = "Vui lòng nhập điểm đi (from).")]
    public string From { get; init; } = string.Empty;

    /// <summary>Điểm đến (Tên trạm, ID trạm, hoặc Tên cuối tuyến)</summary>
    [Required(ErrorMessage = "Vui lòng nhập điểm đến (to).")]
    public string To { get; init; } = string.Empty;

    /// <summary>Ngày đi (định dạng YYYY-MM-DD)</summary>
    [Required(ErrorMessage = "Vui lòng chọn ngày đi (date).")]
    public string Date { get; init; } = string.Empty;

    /// <summary>Mã tuyến xe (tùy chọn lọc theo tuyến)</summary>
    public long? RouteId { get; init; }
}

/// <summary>
/// Giá vé chi tiết cho từng loại đối tượng hành khách.
/// </summary>
public sealed class TripPassengerFareDto
{
    public int PassengerTypeId { get; init; }
    public string PassengerTypeCode { get; init; } = string.Empty;
    public string PassengerTypeName { get; init; } = string.Empty;
    public decimal DiscountPercent { get; init; }
    public decimal Price { get; init; }
}

/// <summary>
/// Dữ liệu chuyến xe đầy đủ cho Frontend và các bên tích hợp.
/// Tương thích hoàn toàn với model BusTrip của Frontend.
/// </summary>
public sealed class TripDto
{
    public long Id { get; init; }
    public long TripId => Id;
    public string TripCode { get; init; } = string.Empty;
    
    // Tuyến đường
    public long RouteId { get; init; }
    public string RouteCode { get; init; } = string.Empty;
    public string RouteName { get; init; } = string.Empty;
    public string StartPoint { get; init; } = string.Empty;
    public string EndPoint { get; init; } = string.Empty;

    // Điểm đi và điểm đến cụ thể của lượt tìm kiếm
    public string DeparturePoint { get; init; } = string.Empty;
    public string ArrivalPoint { get; init; } = string.Empty;

    // Thời gian
    public string DepartureDate { get; init; } = string.Empty;
    public string DepartureTime { get; init; } = string.Empty;
    public string ArrivalTime { get; init; } = string.Empty;
    public string EstimatedArrivalTime { get; init; } = string.Empty;
    public string TravelDate => DepartureDate;

    // Xe buýt & Tài xế
    public string BusPlate { get; init; } = string.Empty;
    public string Vehicle { get; init; } = string.Empty;
    public string DriverName { get; init; } = string.Empty;
    public string? AssistantName { get; init; }

    // Giá vé & Chỗ ngồi (Task 2)
    public decimal Price { get; init; }
    public int TotalSeats { get; init; }
    public List<string> BookedSeats { get; init; } = [];
    public int AvailableSeats { get; init; }
    public List<TripPassengerFareDto> Prices { get; init; } = [];

    // Trạng thái chuyến
    public string Status { get; init; } = string.Empty;
    public int DelayMinutes { get; init; }
}
