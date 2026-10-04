using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public sealed class TripService(AppDbContext db) : ITripService
{
    // trips.DepartureAt lưu UTC (xem backend/README.md); ngày lọc và giờ hiển thị cho người dùng là giờ Việt Nam (UTC+7).
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    /// <summary>
    /// TASK 1 + TASK 2: Tìm kiếm chuyến xe trực tiếp từ Database.
    /// Kiểm tra cùng tuyến, kiểm tra điểm đi đứng trước điểm đến theo thứ tự dừng.
    /// Bổ sung giá vé theo từng đối tượng và số ghế trống thực tế loại trừ vé đã đặt.
    /// </summary>
    public async Task<ServiceResult<IReadOnlyList<TripDto>>> SearchTripsAsync(TripSearchRequest request, CancellationToken ct)
    {
        // 1. Kiểm tra thiếu tham số
        if (string.IsNullOrWhiteSpace(request.From))
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.Invalid, "Vui lòng nhập điểm đi (from).");

        if (string.IsNullOrWhiteSpace(request.To))
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.Invalid, "Vui lòng nhập điểm đến (to).");

        if (string.IsNullOrWhiteSpace(request.Date))
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.Invalid, "Vui lòng chọn ngày đi (date).");

        if (!DateOnly.TryParse(request.Date.Trim(), out var travelDate))
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.Invalid, "Ngày đi không đúng định dạng YYYY-MM-DD.");

        var fromText = request.From.Trim();
        var toText = request.To.Trim();

        // 2. Tra cứu thông tin điểm đi và điểm đến
        var fromMatch = await ResolvePointAsync(fromText, ct);
        if (fromMatch == null)
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.NotFound, $"Điểm đi '{fromText}' không tồn tại trong hệ thống.");

        var toMatch = await ResolvePointAsync(toText, ct);
        if (toMatch == null)
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(ServiceError.NotFound, $"Điểm đến '{toText}' không tồn tại trong hệ thống.");

        // 3. Tải tất cả các tuyến đang hoạt động kèm trạm dừng
        var routesQuery = db.BusRoutes
            .AsNoTracking()
            .Include(r => r.RouteStops)
                .ThenInclude(rs => rs.Stop)
            .Where(r => r.Active);

        if (request.RouteId.HasValue && request.RouteId.Value > 0)
        {
            routesQuery = routesQuery.Where(r => r.Id == request.RouteId.Value);
        }

        var activeRoutes = await routesQuery.ToListAsync(ct);

        // Danh sách các tuyến thỏa mãn: chứa cả điểm đi và điểm đến, VÀ điểm đi đứng trước điểm đến
        var validRouteOrders = new List<(BusRoute Route, int FromOrder, int ToOrder, int? TravelMinutes)>();
        bool foundSameRoute = false;
        bool hasReverseOrderOnSameRoute = false;

        foreach (var route in activeRoutes)
        {
            var fromOrder = GetStopOrderOnRoute(route, fromMatch);
            var toOrder = GetStopOrderOnRoute(route, toMatch);

            if (fromOrder.HasValue && toOrder.HasValue)
            {
                foundSameRoute = true;
                if (fromOrder.Value < toOrder.Value)
                {
                    // Hợp lệ: Điểm đi đứng trước điểm đến theo thứ tự dừng của tuyến
                    var travelMinutes = CalculateTravelMinutes(route, fromMatch, toMatch);
                    validRouteOrders.Add((route, fromOrder.Value, toOrder.Value, travelMinutes));
                }
                else
                {
                    // Điểm đi đứng sau hoặc trùng điểm đến trên cùng tuyến
                    hasReverseOrderOnSameRoute = true;
                }
            }
        }

        // Kiểm tra điều kiện nghiệp vụ
        if (!foundSameRoute)
        {
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(
                ServiceError.Invalid,
                $"Điểm đi '{fromMatch.DisplayName}' và điểm đến '{toMatch.DisplayName}' không thuộc cùng một tuyến xe nào.");
        }

        if (validRouteOrders.Count == 0 && hasReverseOrderOnSameRoute)
        {
            return ServiceResult<IReadOnlyList<TripDto>>.Fail(
                ServiceError.Invalid,
                $"Điểm đi '{fromMatch.DisplayName}' nằm sau điểm đến '{toMatch.DisplayName}' theo lộ trình tuyến xe. Điểm đi bắt buộc phải đứng trước điểm đến.");
        }

        var matchingRouteIds = validRouteOrders.Select(v => v.Route.Id).ToList();

        // 4. Lấy chuyến xe từ Database theo các tuyến hợp lệ và ngày đi
        // Ngày đi là ngày Việt Nam: đổi mốc đầu/cuối ngày sang UTC để so với DepartureAt.
        var startOfDay = DateTime.SpecifyKind(travelDate.ToDateTime(TimeOnly.MinValue) - VietnamOffset, DateTimeKind.Utc);
        var endOfDay = DateTime.SpecifyKind(travelDate.ToDateTime(TimeOnly.MaxValue) - VietnamOffset, DateTimeKind.Utc);

        var trips = await db.Trips
            .AsNoTracking()
            .Include(t => t.BusRoute)
            .Include(t => t.Bus)
            .Include(t => t.TripStaff)
                .ThenInclude(ts => ts.Account)
            .Where(t => matchingRouteIds.Contains(t.RouteId)
                     && t.DepartureAt >= startOfDay
                     && t.DepartureAt <= endOfDay)
            .OrderBy(t => t.DepartureAt)
            .ToListAsync(ct);

        if (trips.Count == 0)
        {
            // Trả về danh sách rỗng nếu ngày này chưa có chuyến
            return ServiceResult<IReadOnlyList<TripDto>>.Success([]);
        }

        var tripIds = trips.Select(t => t.Id).ToList();

        // 5. TÍNH SỐ GHẾ ĐÃ ĐẶT VÀ GHẾ TRỐNG (Task 2)
        // Ghế đã đặt hợp lệ: Ticket có Status IN (Held, Valid, Used), nếu Held thì Booking còn hạn
        var utcNow = DateTime.UtcNow;
        var validTickets = await db.Tickets
            .AsNoTracking()
            .Include(tk => tk.Seat)
            .Include(tk => tk.Booking)
            .Where(tk => tripIds.Contains(tk.TripId)
                      && (tk.Status == TicketStatus.Valid || tk.Status == TicketStatus.Used ||
                         (tk.Status == TicketStatus.Held && tk.Booking != null && tk.Booking.HoldExpiresAt > utcNow)))
            .ToListAsync(ct);

        var bookedSeatsByTrip = validTickets
            .GroupBy(tk => tk.TripId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(tk => tk.Seat != null ? tk.Seat.SeatCode : tk.SeatId.ToString()).Distinct().ToList()
            );

        // 6. TÍNH GIÁ VÉ THEO TUYẾN VÀ ĐỐI TƯỢNG HÀNH KHÁCH (Task 2)
        var allPassengerTypes = await db.PassengerTypes.AsNoTracking().OrderBy(p => p.Id).ToListAsync(ct);
        var allFares = await db.Fares
            .AsNoTracking()
            .Include(f => f.PassengerType)
            .Where(f => matchingRouteIds.Contains(f.RouteId)
                     && f.TicketType == TicketType.Single
                     && f.EffectiveFrom <= travelDate)
            .OrderByDescending(f => f.EffectiveFrom)
            .ToListAsync(ct);

        // 7. Ánh xạ thành TripDto
        var resultList = new List<TripDto>();

        foreach (var trip in trips)
        {
            var routeOrder = validRouteOrders.First(v => v.Route.Id == trip.RouteId);
            var totalSeats = trip.Bus?.Capacity ?? 24;
            var bookedSeats = bookedSeatsByTrip.TryGetValue(trip.Id, out var seats) ? seats : [];
            var availableSeats = Math.Max(0, totalSeats - bookedSeats.Count);

            // Bảng giá chi tiết theo từng loại đối tượng
            var routeFares = allFares.Where(f => f.RouteId == trip.RouteId).ToList();
            var standardFare = routeFares.FirstOrDefault(f => f.PassengerTypeId == 1)?.Price
                               ?? routeFares.FirstOrDefault()?.Price
                               ?? 7000m;

            var prices = new List<TripPassengerFareDto>();
            foreach (var pt in allPassengerTypes)
            {
                var fareRecord = routeFares.FirstOrDefault(f => f.PassengerTypeId == pt.Id);
                decimal price = fareRecord != null
                    ? fareRecord.Price
                    : Math.Round(standardFare * (100 - pt.DiscountPercent) / 100m, 0);

                prices.Add(new TripPassengerFareDto
                {
                    PassengerTypeId = pt.Id,
                    PassengerTypeCode = pt.Code,
                    PassengerTypeName = pt.Name,
                    DiscountPercent = pt.DiscountPercent,
                    Price = price
                });
            }

            // Tên tài xế và phụ xe từ TripStaff
            var driverName = trip.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Driver)?.Account?.FullName
                             ?? "Tài xế công ty";
            var assistantName = trip.TripStaff.FirstOrDefault(ts => ts.Duty == StaffDuty.Conductor)?.Account?.FullName;

            var localDeparture = trip.DepartureAt + VietnamOffset;
            var departureTimeStr = localDeparture.ToString("HH:mm");
            var arrivalTime = routeOrder.TravelMinutes.HasValue
                ? localDeparture.AddMinutes(routeOrder.TravelMinutes.Value)
                : localDeparture.AddMinutes(45);

            var tripDto = new TripDto
            {
                Id = trip.Id,
                TripCode = $"TRIP-{trip.Id}",
                RouteId = trip.RouteId,
                RouteCode = trip.BusRoute.Code,
                RouteName = trip.BusRoute.Name,
                StartPoint = trip.BusRoute.StartPoint,
                EndPoint = trip.BusRoute.EndPoint,
                DeparturePoint = fromMatch.DisplayName,
                ArrivalPoint = toMatch.DisplayName,
                DepartureDate = localDeparture.ToString("yyyy-MM-dd"),
                DepartureTime = departureTimeStr,
                ArrivalTime = arrivalTime.ToString("HH:mm"),
                EstimatedArrivalTime = arrivalTime.ToString("HH:mm"),
                BusPlate = trip.Bus?.PlateNumber ?? "51B-000.00",
                Vehicle = trip.Bus?.PlateNumber ?? "Xe buýt tiêu chuẩn",
                DriverName = driverName,
                AssistantName = assistantName,
                Price = standardFare,
                TotalSeats = totalSeats,
                BookedSeats = bookedSeats,
                AvailableSeats = availableSeats,
                Prices = prices,
                Status = trip.Status.ToString().ToUpperInvariant(),
                DelayMinutes = trip.DelayMinutes
            };

            resultList.Add(tripDto);
        }

        return ServiceResult<IReadOnlyList<TripDto>>.Success(resultList);
    }

    // ==========================================
    // CÁC HÀM TIỆN ÍCH HỖ TRỢ XÁC ĐỊNH ĐIỂM VÀ THỨ TỰ
    // ==========================================

    private record ResolvedPoint(long? StopId, string DisplayName);

    /// <summary>
    /// Nhận diện điểm dừng/điểm đến từ text người dùng nhập (Tên trạm, ID trạm, hoặc Tên đầu/cuối tuyến).
    /// </summary>
    private async Task<ResolvedPoint?> ResolvePointAsync(string input, CancellationToken ct)
    {
        input = input.Trim();
        if (string.IsNullOrEmpty(input)) return null;

        var inputLower = input.ToLower();

        // 1. Nếu là số ID của trạm
        if (long.TryParse(input, out var stopId))
        {
            var stopById = await db.Stops.AsNoTracking().FirstOrDefaultAsync(s => s.Id == stopId, ct);
            if (stopById != null)
                return new ResolvedPoint(stopById.Id, stopById.Name);
        }

        // 2. Tìm trạm dừng theo tên chính xác (case-insensitive)
        var stopExact = await db.Stops.AsNoTracking()
            .Where(s => s.Name.ToLower() == inputLower)
            .OrderBy(s => s.Id)
            .FirstOrDefaultAsync(ct);

        if (stopExact != null)
            return new ResolvedPoint(stopExact.Id, stopExact.Name);

        // 3. Tìm trạm dừng tương đối theo từ khóa (có thứ tự ưu tiên: StartsWith trước, tên ngắn hơn trước, ID tăng dần)
        var stopFuzzy = await db.Stops.AsNoTracking()
            .Where(s => s.Name.ToLower().Contains(inputLower))
            .OrderByDescending(s => s.Name.ToLower().StartsWith(inputLower))
            .ThenBy(s => s.Name.Length)
            .ThenBy(s => s.Id)
            .FirstOrDefaultAsync(ct);

        if (stopFuzzy != null)
            return new ResolvedPoint(stopFuzzy.Id, stopFuzzy.Name);

        // 4. Kiểm tra xem có trùng chính xác với StartPoint hoặc EndPoint của tuyến nào không
        var routeStartExact = await db.BusRoutes.AsNoTracking()
            .Where(r => r.StartPoint.ToLower() == inputLower)
            .OrderBy(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (routeStartExact != null)
            return new ResolvedPoint(null, routeStartExact.StartPoint);

        var routeEndExact = await db.BusRoutes.AsNoTracking()
            .Where(r => r.EndPoint.ToLower() == inputLower)
            .OrderBy(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (routeEndExact != null)
            return new ResolvedPoint(null, routeEndExact.EndPoint);

        // 5. Tìm kiếm tương đối theo StartPoint / EndPoint (có thứ tự ưu tiên xác định)
        var routeStartFuzzy = await db.BusRoutes.AsNoTracking()
            .Where(r => r.StartPoint.ToLower().Contains(inputLower))
            .OrderByDescending(r => r.StartPoint.ToLower().StartsWith(inputLower))
            .ThenBy(r => r.StartPoint.Length)
            .ThenBy(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (routeStartFuzzy != null)
            return new ResolvedPoint(null, routeStartFuzzy.StartPoint);

        var routeEndFuzzy = await db.BusRoutes.AsNoTracking()
            .Where(r => r.EndPoint.ToLower().Contains(inputLower))
            .OrderByDescending(r => r.EndPoint.ToLower().StartsWith(inputLower))
            .ThenBy(r => r.EndPoint.Length)
            .ThenBy(r => r.Id)
            .FirstOrDefaultAsync(ct);

        if (routeEndFuzzy != null)
            return new ResolvedPoint(null, routeEndFuzzy.EndPoint);

        return null;
    }

    /// <summary>
    /// Xác định thứ tự dừng của một trạm trên một tuyến xe (dựa vào StopOrder của bảng route_stops).
    /// </summary>
    private static int? GetStopOrderOnRoute(BusRoute route, ResolvedPoint point)
    {
        // 1. Nếu đã xác định được StopId: kiểm tra trực tiếp theo StopId trong route_stops của tuyến
        if (point.StopId.HasValue)
        {
            var rs = route.RouteStops.FirstOrDefault(s => s.StopId == point.StopId.Value);
            if (rs != null) return rs.StopOrder;

            // Nếu trạm cụ thể không thuộc route_stops của tuyến này:
            // Chỉ chấp nhận nếu tên trạm khớp chính xác với StartPoint hoặc EndPoint của tuyến.
            // Tuyệt đối không dùng Contains() tránh nhầm lẫn trạm trung gian hoặc trạm của tuyến khác.
            if (route.StartPoint.Equals(point.DisplayName, StringComparison.OrdinalIgnoreCase))
            {
                var minOrder = route.RouteStops.Count != 0 ? route.RouteStops.Min(s => s.StopOrder) : 1;
                return Math.Min(0, minOrder - 1);
            }

            if (route.EndPoint.Equals(point.DisplayName, StringComparison.OrdinalIgnoreCase))
            {
                var maxOrder = route.RouteStops.Count != 0 ? route.RouteStops.Max(s => s.StopOrder) : 10;
                return Math.Max(9999, maxOrder + 1);
            }

            return null;
        }

        // 2. Nếu point không có StopId (người dùng tìm theo chuỗi tên đầu/cuối tuyến):
        // So khớp chính xác theo tên trạm trong route_stops trước
        var rsByName = route.RouteStops.FirstOrDefault(s =>
            s.Stop != null && s.Stop.Name.Equals(point.DisplayName, StringComparison.OrdinalIgnoreCase));
        if (rsByName != null) return rsByName.StopOrder;

        // So khớp chính xác với StartPoint của tuyến => xem như trạm đầu (0 hoặc nhỏ hơn minOrder)
        if (route.StartPoint.Equals(point.DisplayName, StringComparison.OrdinalIgnoreCase))
        {
            var minOrder = route.RouteStops.Count != 0 ? route.RouteStops.Min(s => s.StopOrder) : 1;
            return Math.Min(0, minOrder - 1);
        }

        // So khớp chính xác với EndPoint của tuyến => xem như trạm cuối (9999 hoặc lớn hơn maxOrder)
        if (route.EndPoint.Equals(point.DisplayName, StringComparison.OrdinalIgnoreCase))
        {
            var maxOrder = route.RouteStops.Count != 0 ? route.RouteStops.Max(s => s.StopOrder) : 10;
            return Math.Max(9999, maxOrder + 1);
        }

        return null;
    }

    /// <summary>
    /// Tính thời gian di chuyển dự kiến giữa điểm đi và điểm đến.
    /// </summary>
    private static int? CalculateTravelMinutes(BusRoute route, ResolvedPoint from, ResolvedPoint to)
    {
        int? fromMinutes = null;
        int? toMinutes = null;

        if (from.StopId.HasValue)
            fromMinutes = route.RouteStops.FirstOrDefault(s => s.StopId == from.StopId.Value)?.MinutesFromStart;
        else if (route.StartPoint.Equals(from.DisplayName, StringComparison.OrdinalIgnoreCase))
            fromMinutes = 0;

        if (to.StopId.HasValue)
            toMinutes = route.RouteStops.FirstOrDefault(s => s.StopId == to.StopId.Value)?.MinutesFromStart;
        else if (route.EndPoint.Equals(to.DisplayName, StringComparison.OrdinalIgnoreCase))
            toMinutes = route.RouteStops.Count != 0 ? route.RouteStops.Max(s => s.MinutesFromStart) : 45;

        if (fromMinutes.HasValue && toMinutes.HasValue && toMinutes.Value >= fromMinutes.Value)
            return toMinutes.Value - fromMinutes.Value;

        if (toMinutes.HasValue)
            return toMinutes.Value;

        return route.RouteStops.Count != 0 ? route.RouteStops.Max(s => s.MinutesFromStart) : 45;
    }
}
