using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Controller tra cứu chuyến xe và tính giá vé theo đối tượng (SCRUM-54 & SCRUM-55).
/// Phục vụ chức năng Tìm Chuyến và Đặt Vé của Smart Bus Ticketing System.
/// Tách riêng khỏi TripsController (quản lý chuyến chạy ở PR #75) để tránh xung đột route và merge conflict.
/// </summary>
[ApiController]
[Route("api/trips")]
public sealed class TripSearchController(ITripService tripService) : ControllerBase
{
    /// <summary>
    /// TASK 1 + TASK 2 (SCRUM-54 / SCRUM-55): API Tìm kiếm chuyến xe.
    /// Điều kiện: Điểm đi (from), Điểm đến (to), Ngày đi (date - YYYY-MM-DD), Tùy chọn tuyến (routeId).
    /// Kiểm tra: Cùng tuyến, Điểm đi phải đứng TRƯỚC điểm đến theo thứ tự dừng.
    /// Bổ sung: Giá vé theo từng đối tượng hành khách, Số ghế còn trống thực tế từ Database.
    /// </summary>
    /// <param name="from">Điểm đi (Tên trạm, ID trạm hoặc Điểm đầu tuyến)</param>
    /// <param name="to">Điểm đến (Tên trạm, ID trạm hoặc Điểm cuối tuyến)</param>
    /// <param name="date">Ngày đi (Định dạng YYYY-MM-DD)</param>
    /// <param name="routeId">ID tuyến xe (tùy chọn lọc cụ thể)</param>
    /// <param name="ct">CancellationToken</param>
    /// <response code="200">Danh sách các chuyến xe phù hợp kèm giá vé và ghế trống</response>
    /// <response code="400">Yêu cầu không hợp lệ (thiếu tham số, sai định dạng ngày, điểm đi sau điểm đến, hoặc khác tuyến)</response>
    /// <response code="404">Điểm đi hoặc điểm đến không tồn tại trong hệ thống</response>
    [HttpGet("search")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<TripDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<TripDto>>> Search(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? date,
        [FromQuery] long? routeId,
        CancellationToken ct = default)
    {
        var request = new TripSearchRequest
        {
            From = from ?? string.Empty,
            To = to ?? string.Empty,
            Date = date ?? string.Empty,
            RouteId = routeId
        };

        var result = await tripService.SearchTripsAsync(request, ct);

        if (!result.Ok)
        {
            return result.Error switch
            {
                ServiceError.NotFound => NotFound(new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "Không tìm thấy dữ liệu",
                    Detail = result.Message
                }),
                _ => BadRequest(new ProblemDetails
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Yêu cầu tìm kiếm không hợp lệ",
                    Detail = result.Message
                })
            };
        }

        return Ok(result.Value);
    }
}
