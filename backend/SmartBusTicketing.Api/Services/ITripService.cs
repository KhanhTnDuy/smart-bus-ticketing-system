using SmartBusTicketing.Api.DTOs;

namespace SmartBusTicketing.Api.Services;

public interface ITripService
{
    /// <summary>
    /// TASK 1 + TASK 2 (SCRUM-54/55): Tìm kiếm chuyến xe theo điểm đi, điểm đến và ngày đi.
    /// Kiểm tra nghiệp vụ cùng tuyến và điểm đi phải đứng trước điểm đến.
    /// Bổ sung giá vé theo đối tượng và số ghế còn trống thực tế từ Database.
    /// </summary>
    Task<ServiceResult<IReadOnlyList<TripDto>>> SearchTripsAsync(TripSearchRequest request, CancellationToken ct);
}
