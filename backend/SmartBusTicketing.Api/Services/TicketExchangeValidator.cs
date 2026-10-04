using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>Kết quả kiểm tra: hợp lệ thì có Seat, không thì có mã HTTP và thông điệp.</summary>
public sealed record ExchangeTargetResult(Seat? Seat, int StatusCode, string? Message)
{
    public bool IsValid => Seat != null;

    public static ExchangeTargetResult Ok(Seat seat) => new(seat, 200, null);
    public static ExchangeTargetResult BadRequest(string message) => new(null, 400, message);
    public static ExchangeTargetResult Conflict(string message) => new(null, 409, message);
}

/// <summary>
/// Kiểm tra chuyến và ghế đích của một yêu cầu đổi vé.
///
/// Tách riêng vì phải chạy ở hai thời điểm: lúc hành khách gửi yêu cầu và lúc quản lý bấm
/// duyệt. Giữa hai thời điểm đó chuyến có thể đã khởi hành hoặc ghế đã bị người khác đặt,
/// nên không thể tin kết quả kiểm lúc gửi. Để ở một chỗ thì hai lần kiểm không thể lệch
/// bộ quy tắc.
/// </summary>
public interface ITicketExchangeValidator
{
    Task<ExchangeTargetResult> ValidateAsync(Ticket ticket, Trip newTrip, long newSeatId, CancellationToken ct);
}

public sealed class TicketExchangeValidator(AppDbContext db, ISeatHoldService seatHolds) : ITicketExchangeValidator
{
    public async Task<ExchangeTargetResult> ValidateAsync(Ticket ticket, Trip newTrip, long newSeatId, CancellationToken ct)
    {
        if (newTrip.Status is TripStatus.Cancelled or TripStatus.Completed)
        {
            return ExchangeTargetResult.BadRequest("Chuyến xe mới đã bị hủy hoặc đã kết thúc, không thể đổi sang!");
        }

        if (newTrip.DepartureAt <= DateTime.UtcNow)
        {
            return ExchangeTargetResult.BadRequest("Chuyến xe mới đã khởi hành, không thể đổi sang!");
        }

        // Hành trình của vé phải tồn tại trên tuyến của chuyến mới và giữ đúng chiều, nếu
        // không vé sau khi đổi sẽ ghi một hành trình không có thật.
        var stopOrders = await db.RouteStops
            .Where(rs => rs.RouteId == newTrip.RouteId &&
                         (rs.StopId == ticket.BoardStopId || rs.StopId == ticket.AlightStopId))
            .Select(rs => new { rs.StopId, rs.StopOrder })
            .ToListAsync(ct);

        var boardOrder = stopOrders.FirstOrDefault(x => x.StopId == ticket.BoardStopId)?.StopOrder;
        var alightOrder = stopOrders.FirstOrDefault(x => x.StopId == ticket.AlightStopId)?.StopOrder;

        if (boardOrder is null || alightOrder is null)
        {
            return ExchangeTargetResult.BadRequest("Chuyến xe mới không đi qua điểm lên hoặc điểm xuống của vé này!");
        }

        if (boardOrder >= alightOrder)
        {
            return ExchangeTargetResult.BadRequest("Trên tuyến của chuyến mới, điểm lên của vé lại nằm sau điểm xuống!");
        }

        var newSeat = await db.Seats.FirstOrDefaultAsync(s => s.Id == newSeatId && s.BusId == newTrip.BusId, ct);
        if (newSeat == null)
        {
            return ExchangeTargetResult.BadRequest("Ghế mới không thuộc xe của chuyến này hoặc không tồn tại!");
        }

        var taken = await seatHolds.GetTakenSeatIdsAsync(newTrip.Id, [newSeat.Id], ct);
        if (taken.Count > 0)
        {
            return ExchangeTargetResult.Conflict($"Ghế '{newSeat.SeatCode}' đã có người đặt! Vui lòng chọn ghế khác.");
        }

        return ExchangeTargetResult.Ok(newSeat);
    }
}
