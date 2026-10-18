using System.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;
using SmartBusTicketing.Api.Services.Fares;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(AppDbContext db, AuditLogService audit, ISeatHoldService seatHolds) : ControllerBase
{
    private long? GetActorId() => User.AccountId();
    private string GetActorName() => User.Username() ?? "Customer";

    /// <summary>Loại hành khách tiêu chuẩn, dùng khi tài khoản chưa được duyệt đối tượng ưu đãi.</summary>
    private const int StandardPassengerTypeId = 1;

    /// <summary>
    /// Giá dự phòng khi tuyến chưa cấu hình bảng giá. Giữ đúng bằng giá trị TripService dùng
    /// để số tiền ở bước xác nhận không lệch với giá đã hiện lúc tra cứu.
    /// </summary>
    private const decimal FallbackUnitPrice = 7000m;

    /// <summary>Việt Nam không dùng giờ mùa hè nên dùng độ lệch cố định.</summary>
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>
    /// Vé của hành khách đang đăng nhập, chuyến khởi hành gần nhất lên đầu.
    /// Mỗi ghế là một vé nên một lượt đặt nhiều ghế trả về nhiều phần tử cùng BookingCode.
    /// </summary>
    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<MyTicketDto>>> GetMyTickets(CancellationToken ct)
    {
        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        // Chiếu thẳng ra các cột cần dùng thay vì Include: tránh nạp cả đồ thị quan hệ,
        // và tránh luôn nguy cơ Include vòng như đã gặp ở my-schedule.
        var rows = await db.Tickets
            .AsNoTracking()
            .Where(t => t.Booking.PassengerId == passengerId.Value)
            .OrderByDescending(t => t.Trip.DepartureAt)
            .ThenBy(t => t.Seat.SeatCode)
            .Select(t => new
            {
                t.Id,
                t.BookingId,
                t.Booking.BookingCode,
                t.QrCode,
                t.Seat.SeatCode,
                TicketStatus = t.Status,
                BookingStatus = t.Booking.Status,
                t.Booking.HoldExpiresAt,
                t.Booking.FinalAmount,
                // Số vé của cùng lượt đặt, để chia tổng tiền ra giá từng vé.
                SeatCount = t.Booking.Tickets.Count,
                t.TripId,
                t.Trip.RouteId,
                RouteCode = t.Trip.BusRoute.Code,
                RouteName = t.Trip.BusRoute.Name,
                t.Trip.DepartureAt,
                BusPlate = t.Trip.Bus != null ? t.Trip.Bus.PlateNumber : null,
                BoardStopName = t.BoardStop.Name,
                AlightStopName = t.AlightStop.Name,
                PassengerName = t.Booking.Passenger.FullName,
                PassengerPhone = t.Booking.Passenger.Phone,
                // Yêu cầu hủy/đổi đang chờ duyệt trên vé này, nếu có.
                PendingRequest = t.ChangeRequests
                    .Where(r => r.Status == ChangeRequestStatus.Pending)
                    .Select(r => new { r.Id, r.RequestType })
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        // Định dạng ngày/giờ theo giờ Việt Nam làm ở bộ nhớ: DepartureAt lưu UTC và
        // ToString có định dạng thì không dịch được sang SQL.
        return Ok(rows.Select(r =>
        {
            var localDeparture = r.DepartureAt + VietnamOffset;

            return new MyTicketDto
            {
                TicketId = r.Id,
                BookingId = r.BookingId,
                BookingCode = r.BookingCode,
                QrCode = r.QrCode,
                SeatCode = r.SeatCode,
                Status = r.TicketStatus.ToString(),
                BookingStatus = r.BookingStatus.ToString(),
                HoldExpiresAt = r.HoldExpiresAt,
                TripId = r.TripId,
                RouteId = r.RouteId,
                RouteCode = r.RouteCode,
                RouteName = r.RouteName,
                DepartureDate = localDeparture.ToString("yyyy-MM-dd"),
                DepartureTime = localDeparture.ToString("HH:mm"),
                BusPlate = r.BusPlate ?? string.Empty,
                BoardStopName = r.BoardStopName,
                AlightStopName = r.AlightStopName,
                Price = r.SeatCount > 0 ? r.FinalAmount / r.SeatCount : r.FinalAmount,
                BookingFinalAmount = r.FinalAmount,
                PassengerName = r.PassengerName,
                PassengerPhone = r.PassengerPhone,
                PendingRequestType = r.PendingRequest?.RequestType.ToString(),
                PendingRequestId = r.PendingRequest?.Id
            };
        }).ToList());
    }

    /// <summary>Chỉ hành khách đặt vé. Nhân viên đặt được sẽ tạo lượt đặt mà không ai thanh toán được (thanh toán cũng chỉ dành cho hành khách) và chiếm ghế trong 10 phút.</summary>
    /// <summary>
    /// Khách hủy một lượt đặt đang giữ chỗ mà chưa trả tiền (bấm "Hủy thanh toán" / quay lại đổi ghế): lượt đặt và
    /// các vé Held chuyển sang Cancelled nên ghế được nhả ngay thay vì đợi hết 10 phút. Lượt đặt đã thanh toán thì
    /// không hủy ở đây (dùng yêu cầu hủy vé, có hoàn tiền). Gọi lặp lại là an toàn.
    ///
    /// Cố ý KHÔNG đụng tới giao dịch đang chờ: khách có thể đã mở trang ngân hàng ở tab khác và vẫn trả tiền sau
    /// khi hủy. Khi đó PaymentSettlementService thấy lượt đặt không còn Pending nên tự mở yêu cầu hoàn tiền,
    /// còn nếu đánh dấu giao dịch Failed ở đây thì khoản tiền đó sẽ bị bỏ qua.
    /// </summary>
    [HttpPost("{id:long}/cancel"), Authorize(Roles = "Passenger")]
    public async Task<IActionResult> CancelPendingBooking(long id, CancellationToken ct)
    {
        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        // 404 cả khi lượt đặt của người khác: 403 sẽ tiết lộ rằng mã đó tồn tại.
        var booking = await db.Bookings.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == id && b.PassengerId == passengerId, ct);
        if (booking is null)
        {
            return NotFound(new { message = "Không tìm thấy lượt đặt vé của bạn." });
        }

        const string alreadyPaid = "Lượt đặt này đã được thanh toán. Hãy gửi yêu cầu hủy vé ở mục Vé điện tử nếu muốn hủy.";
        if (booking.Status == BookingStatus.Confirmed) return Conflict(new { message = alreadyPaid });
        if (booking.Status != BookingStatus.Pending)
        {
            return Ok(new { message = "Lượt đặt này đã được hủy hoặc hết hạn giữ chỗ.", released = false });
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        // Chỉ đổi khi còn Pending: nếu vừa lúc thanh toán xác nhận xong thì không đè lên.
        var cancelled = await db.Bookings
            .Where(b => b.Id == id && b.Status == BookingStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, BookingStatus.Cancelled), ct);
        if (cancelled != 1)
        {
            await tx.RollbackAsync(ct);
            var current = await db.Bookings.AsNoTracking().Where(b => b.Id == id).Select(b => b.Status).FirstAsync(ct);
            return current == BookingStatus.Confirmed
                ? Conflict(new { message = alreadyPaid })
                : Ok(new { message = "Lượt đặt này đã được hủy hoặc hết hạn giữ chỗ.", released = false });
        }

        var released = await db.Tickets
            .Where(t => t.BookingId == id && t.Status == TicketStatus.Held)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Status, TicketStatus.Cancelled), ct);
        await tx.CommitAsync(ct);

        await audit.WriteAsync(passengerId, GetActorName(), $"Hủy giữ chỗ {booking.BookingCode}", AuditActionType.Update,
            $"BOOKING-{id}", details: $"Khách hủy thanh toán, nhả {released} ghế.", ct: ct);
        return Ok(new { message = "Đã hủy giữ chỗ, ghế đã được nhả.", released = true, seats = released });
    }

    [HttpPost, Authorize(Roles = "Passenger")]
    public async Task<IActionResult> ConfirmBooking([FromBody] ConfirmBookingDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var passengerId = GetActorId();
        if (passengerId is null)
        {
            return Unauthorized(new { message = "Không xác định được tài khoản từ phiên đăng nhập!" });
        }

        using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);

        try
        {
            var trip = await db.Trips.FirstOrDefaultAsync(t => t.Id == dto.TripId, ct);
            if (trip == null)
            {
                return NotFound(new { message = $"Không tìm thấy chuyến xe có mã ID = {dto.TripId}!" });
            }

            // SCRUM-62 - kiểm tra lại ở máy chủ: không giữ chỗ trên chuyến đã huỷ, đã kết thúc
            // hoặc đã rời bến. Client có chặn ngày trong quá khứ (SCRUM-57) nhưng đó chỉ là lớp
            // hiển thị, và chuyến có thể bị huỷ ngay trong lúc khách đang chọn ghế.
            if (trip.Status is TripStatus.Cancelled or TripStatus.Completed)
            {
                return BadRequest(new { message = "Chuyến xe đã bị hủy hoặc đã kết thúc, không thể đặt vé!" });
            }

            if (trip.DepartureAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Chuyến xe đã khởi hành, không thể đặt vé!" });
            }

            // SCRUM-62 - kiểm tra lại ở máy chủ: điểm lên và điểm xuống phải nằm trên tuyến
            // của chuyến, và điểm lên phải đứng trước điểm xuống. Đây là cùng ràng buộc mà
            // API tìm chuyến (SCRUM-54) đã áp lúc tra cứu; client có thể bỏ qua nên phải
            // kiểm lại, nếu không vé sẽ ghi một hành trình không tồn tại.
            if (dto.BoardStopId == dto.AlightStopId)
            {
                return BadRequest(new { message = "Điểm lên xe và điểm xuống xe không được trùng nhau!" });
            }

            var stopOrders = await db.RouteStops
                .Where(rs => rs.RouteId == trip.RouteId &&
                             (rs.StopId == dto.BoardStopId || rs.StopId == dto.AlightStopId))
                .Select(rs => new { rs.StopId, rs.StopOrder })
                .ToListAsync(ct);

            var boardOrder = stopOrders.FirstOrDefault(x => x.StopId == dto.BoardStopId)?.StopOrder;
            var alightOrder = stopOrders.FirstOrDefault(x => x.StopId == dto.AlightStopId)?.StopOrder;

            if (boardOrder is null || alightOrder is null)
            {
                return BadRequest(new { message = "Điểm lên xe hoặc điểm xuống xe không thuộc tuyến của chuyến này!" });
            }

            if (boardOrder >= alightOrder)
            {
                return BadRequest(new { message = "Điểm lên xe phải đứng trước điểm xuống xe trên tuyến!" });
            }

            var seats = await db.Seats
                .Where(s => s.BusId == trip.BusId && dto.SeatIds.Contains(s.Id))
                .ToListAsync(ct);

            if (seats.Count != dto.SeatIds.Count)
            {
                return BadRequest(new { message = "Một số ghế được chọn không thuộc xe của chuyến này hoặc không tồn tại!" });
            }

            // Quy tắc ghế trống và việc nhả lượt giữ chỗ đã chết nằm ở SeatHoldService,
            // dùng chung với đổi vé để hai bên không bao giờ lệch nhau.
            var takenSeatIds = await seatHolds.GetTakenSeatIdsAsync(dto.TripId, dto.SeatIds, ct);

            if (takenSeatIds.Any())
            {
                var takenSeatCodes = seats
                    .Where(s => takenSeatIds.Contains(s.Id))
                    .Select(s => s.SeatCode)
                    .ToList();

                await transaction.RollbackAsync(ct);
                return Conflict(new { message = $"Ghế '{string.Join(", ", takenSeatCodes)}' vừa bị người khác chọn! Vui lòng chọn ghế khác." });
            }

            await seatHolds.ReleaseStaleHoldsAsync(dto.TripId, dto.SeatIds, ct);

            var baseAmount = await CalculateFinalAmountAsync(trip, passengerId.Value, seats.Count, dto.BoardStopId, dto.AlightStopId, ct);
            Voucher? appliedVoucher = null;
            decimal discountAmount = 0;

            // SCRUM-67: Kiểm tra voucher khi đặt vé
            if (!string.IsNullOrWhiteSpace(dto.VoucherCode))
            {
                var vCode = dto.VoucherCode.Trim().ToUpperInvariant();

                // Khóa dòng voucher bằng FOR UPDATE trong cùng transaction để tuần tự hóa các yêu cầu đồng thời,
                // ngăn chặn race condition khi hai yêu cầu cùng lúc tranh chấp lượt sử dụng cuối cùng.
                var voucher = await db.Vouchers
                    .FromSqlInterpolated($"SELECT * FROM vouchers WHERE Code = {vCode} FOR UPDATE")
                    .FirstOrDefaultAsync(ct);

                if (voucher == null)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{dto.VoucherCode}' không tồn tại trong hệ thống." });
                }

                var nowUtc = DateTime.UtcNow;
                if (nowUtc < voucher.StartAt)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{voucher.Code}' chưa đến thời gian áp dụng." });
                }

                if (nowUtc > voucher.EndAt)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{voucher.Code}' đã hết hạn sử dụng." });
                }

                // Kiểm tra số lượt đã dùng thực tế trong CSDL (Confirmed hoặc Pending còn hiệu lực giữ chỗ)
                var usedCount = await db.Bookings
                    .CountAsync(b => b.VoucherId == voucher.Id &&
                        (b.Status == BookingStatus.Confirmed || (b.Status == BookingStatus.Pending && b.HoldExpiresAt > nowUtc)), ct);

                if (voucher.UsageLimit > 0 && usedCount >= voucher.UsageLimit)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{voucher.Code}' đã hết số lượt sử dụng tối đa." });
                }

                // Kiểm tra điều kiện số vé và giá trị đơn hàng tối thiểu (SCRUM-67)
                var minSeats = VouchersController.GetMinSeats(voucher.DiscountType, voucher.DiscountValue);
                if (seats.Count < minSeats)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{voucher.Code}' yêu cầu mua từ {minSeats} vé trở lên (bạn đang chọn {seats.Count} vé). Vui lòng chọn thêm ghế hoặc dùng mã áp dụng cho 1 vé (ví dụ: CHAOHEXANH)." });
                }

                var minOrder = VouchersController.GetMinOrder(voucher.DiscountType, voucher.DiscountValue);
                if (baseAmount < minOrder)
                {
                    await transaction.RollbackAsync(ct);
                    return BadRequest(new { message = $"Mã giảm giá '{voucher.Code}' yêu cầu giá trị đơn hàng tối thiểu {minOrder:N0} đ (đơn hiện tại là {baseAmount:N0} đ)." });
                }

                appliedVoucher = voucher;
                if (voucher.DiscountType == DiscountType.Percent)
                {
                    discountAmount = Math.Round(baseAmount * (voucher.DiscountValue / 100m));
                }
                else
                {
                    discountAmount = Math.Min(baseAmount, voucher.DiscountValue);
                }
            }

            var finalAmount = Math.Max(0, baseAmount - discountAmount);

            // Booking phải có đủ các cột NOT NULL theo schema, nếu không SaveChanges sẽ ném
            // DbUpdateException và bị catch bên dưới quy nhầm thành lỗi tranh chấp ghế.
            var booking = new Booking
            {
                // 16 ký tự thay vì 8: booking_code có unique index, mà mọi DbUpdateException ở
                // đây đều bị quy về "ghế vừa bị người khác chọn". Mã càng ngắn thì càng dễ trùng
                // và càng dễ báo sai nguyên nhân. 19 ký tự vẫn vừa cột VARCHAR(20).
                BookingCode = "BK-" + Guid.NewGuid().ToString("N")[..16].ToUpper(),
                PassengerId = passengerId.Value,
                TripId = dto.TripId,
                VoucherId = appliedVoucher?.Id,
                Status = BookingStatus.Pending,
                HoldExpiresAt = DateTime.UtcNow.AddMinutes(10),
                FinalAmount = finalAmount
            };

            db.Bookings.Add(booking);
            await db.SaveChangesAsync(ct);

            foreach (var seat in seats)
            {
                var ticket = new Ticket
                {
                    BookingId = booking.Id,
                    TripId = dto.TripId,
                    SeatId = seat.Id,
                    BoardStopId = dto.BoardStopId,
                    AlightStopId = dto.AlightStopId,
                    Status = TicketStatus.Held,
                    QrCode = Guid.NewGuid().ToString("N")
                };

                db.Tickets.Add(ticket);
            }

            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            await audit.WriteAsync(GetActorId(), GetActorName(), "CONFIRM_BOOKING", AuditActionType.Create, $"TRIP-{dto.TripId}", ct: ct);

            return Ok(new
            {
                message = "Xác nhận đặt vé thành công!",
                bookingId = booking.Id,
                bookingCode = booking.BookingCode,
                tripId = dto.TripId,
                bookedSeats = seats.Select(s => s.SeatCode).ToList(),
                totalSeats = seats.Count,
                originalAmount = baseAmount,
                discountAmount = discountAmount,
                finalAmount = booking.FinalAmount,
                voucherCode = appliedVoucher?.Code,
                holdExpiresAt = booking.HoldExpiresAt
            });
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(ct);
            return Conflict(new { message = "Ghế vừa bị người khác đặt đồng thời! Vui lòng chọn lại ghế." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            return StatusCode(500, new { message = "Lỗi hệ thống khi xác nhận đặt vé!", detail = ex.Message });
        }
    }

    /// <summary>
    /// Tổng tiền tạm tính của lần giữ chỗ: giá vé lượt của tuyến theo đối tượng hành khách,
    /// nhân số ghế đã chọn. Cách chọn giá giữ giống TripService (SCRUM-55) để số tiền ở bước
    /// xác nhận khớp với giá hành khách đã thấy lúc tra cứu.
    /// </summary>
    private async Task<decimal> CalculateFinalAmountAsync(
        Trip trip, long passengerId, int seatCount, long boardStopId, long alightStopId, CancellationToken ct)
    {
        // Ngày đi theo góc nhìn hành khách: DepartureAt lưu UTC nên phải đổi sang giờ Việt Nam
        // trước khi so với Fare.EffectiveFrom.
        var travelDate = DateOnly.FromDateTime(trip.DepartureAt + VietnamOffset);

        // Giá ưu đãi chỉ áp khi hồ sơ đối tượng đã được duyệt và còn hiệu lực; còn lại tính giá
        // tiêu chuẩn. Phần duyệt đối tượng ưu đãi nằm ở backlog nên hiện hầu hết sẽ rơi vào
        // nhánh tiêu chuẩn.
        var passengerTypeId = await db.PassengerVerifications
            .AsNoTracking()
            .Where(v => v.AccountId == passengerId
                     && v.Status == VerificationStatus.Approved
                     && (v.ValidUntil == null || v.ValidUntil >= travelDate))
            .OrderByDescending(v => v.Id)
            .Select(v => (int?)v.PassengerTypeId)
            .FirstOrDefaultAsync(ct) ?? StandardPassengerTypeId;

        // Bảng giá niêm yết theo km hành trình (nếu đã lập) là giá chính thức: tra theo km từ trạm lên đến trạm xuống, rồi giảm theo đối tượng.
        // Chặng chưa có km hoặc không rơi vào bậc nào thì dùng cách cũ bên dưới.
        var bands = await db.DistanceFares.AsNoTracking().OrderBy(b => b.FromKm).ToListAsync(ct);
        if (bands.Count > 0)
        {
            var legStops = await db.RouteStops.AsNoTracking()
                .Where(rs => rs.RouteId == trip.RouteId && (rs.StopId == boardStopId || rs.StopId == alightStopId))
                .ToListAsync(ct);
            var bandPrice = FareCalculator.BandPrice(bands, FareCalculator.LegKm(
                legStops.FirstOrDefault(s => s.StopId == boardStopId), legStops.FirstOrDefault(s => s.StopId == alightStopId)));
            if (bandPrice is not null)
            {
                var discount = await db.PassengerTypes.AsNoTracking()
                    .Where(p => p.Id == passengerTypeId).Select(p => p.DiscountPercent).FirstOrDefaultAsync(ct);
                return FareCalculator.ApplyDiscount(bandPrice.Value, discount) * seatCount;
            }
        }

        var routeFares = await db.Fares
            .AsNoTracking()
            .Where(f => f.RouteId == trip.RouteId
                     && f.TicketType == TicketType.Single
                     && f.EffectiveFrom <= travelDate)
            .OrderByDescending(f => f.EffectiveFrom)
            .ToListAsync(ct);

        var unitPrice = routeFares.FirstOrDefault(f => f.PassengerTypeId == passengerTypeId)?.Price
                        ?? routeFares.FirstOrDefault(f => f.PassengerTypeId == StandardPassengerTypeId)?.Price
                        ?? routeFares.FirstOrDefault()?.Price
                        ?? FallbackUnitPrice;

        return unitPrice * seatCount;
    }
}
