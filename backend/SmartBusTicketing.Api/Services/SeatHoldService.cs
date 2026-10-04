using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// Quy tắc "ghế còn trống hay không" dùng chung cho đặt vé và đổi vé.
///
/// Tách ra một chỗ vì quy tắc này tinh vi hơn vẻ ngoài: cột tính toán ActiveSeatKey
/// (xem AppDbContext) chỉ nhìn vào Status của vé, nên một lượt giữ chỗ đã hết hạn vẫn
/// chiếm khóa duy nhất ở tầng cơ sở dữ liệu dù mọi truy vấn đọc đã coi ghế là trống.
/// Nhân đôi đoạn này ở hai controller là cách chắc chắn để hai bên lệch nhau.
/// </summary>
public interface ISeatHoldService
{
    /// <summary>Trong số các ghế được chọn, ghế nào đang thực sự bị chiếm.</summary>
    Task<List<long>> GetTakenSeatIdsAsync(long tripId, IReadOnlyCollection<long> seatIds, CancellationToken ct);

    /// <summary>
    /// Chuyển các vé giữ chỗ đã chết sang Expired để ActiveSeatKey về NULL, nhờ đó ghế
    /// bán lại được. Gọi trong cùng transaction, ngay trước khi thêm vé mới.
    /// </summary>
    Task ReleaseStaleHoldsAsync(long tripId, IReadOnlyCollection<long> seatIds, CancellationToken ct);
}

public sealed class SeatHoldService(AppDbContext db) : ISeatHoldService
{
    public async Task<List<long>> GetTakenSeatIdsAsync(long tripId, IReadOnlyCollection<long> seatIds, CancellationToken ct)
    {
        // Ghế bị chiếm khi vé còn hiệu lực, đã dùng, hoặc đang được giữ bởi một lượt đặt
        // chưa quá hạn. Hai điều kiện của nhánh giữ chỗ phải cùng đúng: dùng OR thì vé hết
        // hạn vẫn bị tính là chiếm và ghế không bao giờ được nhả.
        return await db.Tickets
            .Where(t => t.TripId == tripId && seatIds.Contains(t.SeatId))
            .Where(t => t.Status == TicketStatus.Valid ||
                        t.Status == TicketStatus.Used ||
                        (t.Status == TicketStatus.Held && t.Booking != null &&
                         t.Booking.Status == BookingStatus.Pending && t.Booking.HoldExpiresAt > DateTime.UtcNow))
            .Select(t => t.SeatId)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task ReleaseStaleHoldsAsync(long tripId, IReadOnlyCollection<long> seatIds, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        // Chỉ nhả đúng những lượt giữ chỗ đã chết: không có lượt đặt, lượt đặt đã huỷ hoặc
        // hết hạn, hoặc còn Pending nhưng quá hạn giữ. Lượt đặt đã Confirmed thì không đụng
        // tới, dù hiện chưa có luồng thanh toán nào đặt trạng thái đó.
        var staleHeldTickets = await db.Tickets
            .Include(t => t.Booking)
            .Where(t => t.TripId == tripId && seatIds.Contains(t.SeatId))
            .Where(t => t.Status == TicketStatus.Held)
            .Where(t => t.Booking == null ||
                        t.Booking.Status == BookingStatus.Cancelled ||
                        t.Booking.Status == BookingStatus.Expired ||
                        (t.Booking.Status == BookingStatus.Pending && t.Booking.HoldExpiresAt <= now))
            .ToListAsync(ct);

        if (staleHeldTickets.Count == 0) return;

        foreach (var stale in staleHeldTickets)
        {
            stale.Status = TicketStatus.Expired;

            if (stale.Booking is { Status: BookingStatus.Pending })
            {
                stale.Booking.Status = BookingStatus.Expired;
            }
        }

        // Lưu ngay để ActiveSeatKey của các vé này về NULL trước khi thêm vé mới, nếu không
        // cả hai thao tác vào cùng một lệnh SaveChanges và vẫn trùng khóa.
        await db.SaveChangesAsync(ct);
    }
}
