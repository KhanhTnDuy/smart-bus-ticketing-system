using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public interface IBusService
{
    Task<PagedResponse<BusDto>> GetBusesAsync(string? search, BusStatus? status, int page, int pageSize, CancellationToken ct);
    Task<BusDto?> GetBusAsync(long id, CancellationToken ct);
    Task<ServiceResult<BusDto>> CreateBusAsync(BusRequest request, CancellationToken ct);
    Task<ServiceResult<BusDto>> UpdateBusAsync(long id, BusRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteBusAsync(long id, CancellationToken ct);
}

public sealed class BusService(AppDbContext db) : IBusService
{
    private static (int Page, int PageSize) Normalize(int page, int pageSize) =>
        (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    private static string FormatBusStatus(BusStatus status) => status switch
    {
        BusStatus.Active => "Hoạt động",
        BusStatus.Maintenance => "Bảo trì",
        BusStatus.Inactive => "Ngừng hoạt động",
        _ => status.ToString()
    };

    public async Task<PagedResponse<BusDto>> GetBusesAsync(string? search, BusStatus? status, int page, int pageSize, CancellationToken ct)
    {
        var (normPage, normPageSize) = Normalize(page, pageSize);
        var query = db.Buses.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(b => b.PlateNumber.Contains(term));
        }

        if (status.HasValue)
        {
            query = query.Where(b => b.Status == status.Value);
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(b => b.PlateNumber)
            .Skip((normPage - 1) * normPageSize)
            .Take(normPageSize)
            .Select(b => new BusDto
            {
                Id = b.Id,
                PlateNumber = b.PlateNumber,
                Capacity = b.Capacity,
                Status = b.Status,
                StatusText = FormatBusStatus(b.Status),
                TotalSeats = b.Seats.Count,
                ActiveTripsCount = b.Trips.Count(t => t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running)
            })
            .ToListAsync(ct);

        return new PagedResponse<BusDto>
        {
            Data = items,
            Page = normPage,
            PageSize = normPageSize,
            Total = total
        };
    }

    public async Task<BusDto?> GetBusAsync(long id, CancellationToken ct)
    {
        return await db.Buses.AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new BusDto
            {
                Id = b.Id,
                PlateNumber = b.PlateNumber,
                Capacity = b.Capacity,
                Status = b.Status,
                StatusText = FormatBusStatus(b.Status),
                TotalSeats = b.Seats.Count,
                ActiveTripsCount = b.Trips.Count(t => t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running)
            })
            .FirstOrDefaultAsync(ct);
    }

    public async Task<ServiceResult<BusDto>> CreateBusAsync(BusRequest request, CancellationToken ct)
    {
        var plate = request.PlateNumber.Trim().ToUpperInvariant();
        if (await db.Buses.AnyAsync(b => b.PlateNumber == plate, ct))
        {
            return ServiceResult<BusDto>.Fail(ServiceError.Conflict, $"Biển số xe '{plate}' đã tồn tại trong hệ thống.");
        }

        var bus = new Bus
        {
            PlateNumber = plate,
            Capacity = request.Capacity,
            Status = request.Status
        };

        // Tự động sinh sơ đồ ghế (2 cột mỗi bên: A1, A2... B1, B2...)
        var seats = new List<Seat>();
        int seatsPerRow = 4;
        int totalRows = (int)Math.Ceiling((double)request.Capacity / seatsPerRow);
        int currentSeatNumber = 1;

        for (int r = 1; r <= totalRows; r++)
        {
            for (int c = 1; c <= seatsPerRow; c++)
            {
                if (currentSeatNumber > request.Capacity) break;
                char rowLetter = (char)('A' + ((currentSeatNumber - 1) % 4));
                int seatIndex = ((currentSeatNumber - 1) / 4) + 1;
                seats.Add(new Seat
                {
                    SeatCode = $"{rowLetter}{seatIndex}",
                    SeatRow = r,
                    SeatCol = c
                });
                currentSeatNumber++;
            }
        }
        bus.Seats = seats;

        db.Buses.Add(bus);
        await db.SaveChangesAsync(ct);

        var dto = new BusDto
        {
            Id = bus.Id,
            PlateNumber = bus.PlateNumber,
            Capacity = bus.Capacity,
            Status = bus.Status,
            StatusText = FormatBusStatus(bus.Status),
            TotalSeats = seats.Count,
            ActiveTripsCount = 0
        };

        return ServiceResult<BusDto>.Success(dto);
    }

    public async Task<ServiceResult<BusDto>> UpdateBusAsync(long id, BusRequest request, CancellationToken ct)
    {
        var bus = await db.Buses.Include(b => b.Seats).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bus == null)
        {
            return ServiceResult<BusDto>.Fail(ServiceError.NotFound, $"Không tìm thấy xe buýt với ID {id}.");
        }

        var plate = request.PlateNumber.Trim().ToUpperInvariant();
        if (plate != bus.PlateNumber && await db.Buses.AnyAsync(b => b.Id != id && b.PlateNumber == plate, ct))
        {
            return ServiceResult<BusDto>.Fail(ServiceError.Conflict, $"Biển số xe '{plate}' đã được sử dụng cho xe khác.");
        }

        // Nếu xe đang chuyển sang bảo trì hoặc ngừng hoạt động, kiểm tra xem có chuyến đang lên lịch sắp tới không
        if (request.Status != BusStatus.Active && bus.Status == BusStatus.Active)
        {
            var upcomingTrips = await db.Trips.AnyAsync(t => t.BusId == id &&
                (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running) &&
                t.DepartureAt >= DateTime.UtcNow.AddHours(-1), ct);

            if (upcomingTrips)
            {
                return ServiceResult<BusDto>.Fail(ServiceError.Conflict,
                    $"Xe buýt '{bus.PlateNumber}' đang được gán cho các chuyến chạy sắp tới. " +
                    "Vui lòng phân công xe khác thay thế trước khi chuyển sang trạng thái Bảo trì/Ngừng hoạt động.");
            }
        }

        bus.PlateNumber = plate;
        bus.Status = request.Status;

        // Nếu thay đổi capacity và chưa có vé nào bán cho xe này
        if (request.Capacity != bus.Capacity)
        {
            var hasTickets = await db.Tickets.AnyAsync(tk => tk.Seat.BusId == id, ct);
            if (!hasTickets)
            {
                bus.Capacity = request.Capacity;
                db.Seats.RemoveRange(bus.Seats);

                var newSeats = new List<Seat>();
                int seatsPerRow = 4;
                int totalRows = (int)Math.Ceiling((double)request.Capacity / seatsPerRow);
                int currentSeatNumber = 1;

                for (int r = 1; r <= totalRows; r++)
                {
                    for (int c = 1; c <= seatsPerRow; c++)
                    {
                        if (currentSeatNumber > request.Capacity) break;
                        char rowLetter = (char)('A' + ((currentSeatNumber - 1) % 4));
                        int seatIndex = ((currentSeatNumber - 1) / 4) + 1;
                        newSeats.Add(new Seat
                        {
                            BusId = id,
                            SeatCode = $"{rowLetter}{seatIndex}",
                            SeatRow = r,
                            SeatCol = c
                        });
                        currentSeatNumber++;
                    }
                }
                bus.Seats = newSeats;
            }
        }

        await db.SaveChangesAsync(ct);

        var dto = new BusDto
        {
            Id = bus.Id,
            PlateNumber = bus.PlateNumber,
            Capacity = bus.Capacity,
            Status = bus.Status,
            StatusText = FormatBusStatus(bus.Status),
            TotalSeats = bus.Seats.Count,
            ActiveTripsCount = await db.Trips.CountAsync(t => t.BusId == id && (t.Status == TripStatus.Scheduled || t.Status == TripStatus.Running), ct)
        };

        return ServiceResult<BusDto>.Success(dto);
    }

    public async Task<ServiceResult<bool>> DeleteBusAsync(long id, CancellationToken ct)
    {
        var bus = await db.Buses.FindAsync([id], ct);
        if (bus == null)
        {
            return ServiceResult<bool>.Fail(ServiceError.NotFound, $"Không tìm thấy xe buýt với ID {id}.");
        }

        var hasTrips = await db.Trips.AnyAsync(t => t.BusId == id, ct);
        if (hasTrips)
        {
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                $"Không thể xóa xe buýt '{bus.PlateNumber}' vì xe đã được sử dụng trong lịch sử chuyến chạy. " +
                "Hãy chuyển trạng thái xe sang 'Ngừng hoạt động' thay vì xóa.");
        }

        db.Buses.Remove(bus);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }
}
