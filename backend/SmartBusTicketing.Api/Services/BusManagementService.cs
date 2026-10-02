using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

public interface IBusManagementService
{
    Task<PagedResponse<BusDto>> GetBusesAsync(string? search, BusStatus? status, int page, int pageSize, CancellationToken ct);
    Task<BusDetailDto?> GetBusAsync(long id, CancellationToken ct);
    Task<ServiceResult<BusDetailDto>> CreateBusAsync(BusRequest request, CancellationToken ct);
    Task<ServiceResult<BusDetailDto>> UpdateBusAsync(long id, BusRequest request, CancellationToken ct);
    Task<ServiceResult<bool>> DeleteBusAsync(long id, CancellationToken ct);
}

/// <summary>SCRUM-49 - CRUD xe buýt (biển số, sức chứa, trạng thái) và tạo sơ đồ ghế theo hàng / cột.</summary>
public sealed class BusManagementService(AppDbContext db) : IBusManagementService
{
    private static (int Page, int PageSize) Normalize(int page, int pageSize) => (Math.Max(1, page), Math.Clamp(pageSize, 1, 100));

    private static string NormalizePlate(string plate) => plate.Trim().ToUpperInvariant();

    /// <summary>Mã ghế: chữ cái là hàng (A, B, ...), số là cột (1, 2, ...). Ví dụ hàng 1 cột 3 là "A3".</summary>
    public static string SeatCodeOf(int row, int col) => $"{(char)('A' + row - 1)}{col}";

    /// <summary>Danh sách (hàng, cột) cho <paramref name="capacity"/> ghế, điền lần lượt từng hàng.</summary>
    private static List<(int Row, int Col)> LayoutOf(int capacity, int columns)
    {
        var cells = new List<(int, int)>(capacity);
        for (var i = 0; i < capacity; i++) cells.Add((i / columns + 1, i % columns + 1));
        return cells;
    }

    /// <summary>Capacity phải khớp với lưới Rows x Columns và hàng cuối không được để trống hoàn toàn.</summary>
    private static string? ValidateLayout(BusRequest r)
    {
        if (r.Capacity > r.Rows * r.Columns)
            return $"Sức chứa {r.Capacity} lớn hơn số ghế của lưới {r.Rows} hàng x {r.Columns} cột ({r.Rows * r.Columns}).";
        if (r.Capacity <= (r.Rows - 1) * r.Columns)
            return $"Sức chứa {r.Capacity} không đủ để có {r.Rows} hàng; hàng cuối sẽ trống. Giảm số hàng hoặc tăng sức chứa.";
        return null;
    }

    private static BusDto ToDto(Bus b, int rows, int columns, int tripCount) => new()
    {
        Id = b.Id,
        PlateNumber = b.PlateNumber,
        Capacity = b.Capacity,
        Status = b.Status,
        Rows = rows,
        Columns = columns,
        TripCount = tripCount
    };

    // ===================== Truy vấn =====================

    public async Task<PagedResponse<BusDto>> GetBusesAsync(string? search, BusStatus? status, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = Normalize(page, pageSize);
        var query = db.Buses.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            query = query.Where(b => b.PlateNumber.Contains(value));
        }
        if (status.HasValue) query = query.Where(b => b.Status == status.Value);

        var total = await query.CountAsync(ct);
        var data = await query.OrderBy(b => b.PlateNumber).Skip((page - 1) * pageSize).Take(pageSize)
            .Select(b => new BusDto
            {
                Id = b.Id,
                PlateNumber = b.PlateNumber,
                Capacity = b.Capacity,
                Status = b.Status,
                Rows = b.Seats.Max(s => (int?)s.SeatRow) ?? 0,
                Columns = b.Seats.Max(s => (int?)s.SeatCol) ?? 0,
                TripCount = b.Trips.Count
            }).ToListAsync(ct);

        return new PagedResponse<BusDto> { Data = data, Page = page, PageSize = pageSize, Total = total };
    }

    public async Task<BusDetailDto?> GetBusAsync(long id, CancellationToken ct)
    {
        var bus = await db.Buses.AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bus is null) return null;
        return await BuildDetailAsync(bus, ct);
    }

    private async Task<BusDetailDto> BuildDetailAsync(Bus bus, CancellationToken ct)
    {
        var seats = await db.Seats.AsNoTracking().Where(s => s.BusId == bus.Id)
            .OrderBy(s => s.SeatRow).ThenBy(s => s.SeatCol)
            .Select(s => new BusSeatDto { Id = s.Id, SeatCode = s.SeatCode, Row = s.SeatRow, Column = s.SeatCol })
            .ToListAsync(ct);
        var tripCount = await db.Trips.CountAsync(t => t.BusId == bus.Id, ct);

        return new BusDetailDto
        {
            Bus = ToDto(bus, seats.Count == 0 ? 0 : seats.Max(s => s.Row), seats.Count == 0 ? 0 : seats.Max(s => s.Column), tripCount),
            Seats = seats
        };
    }

    // ===================== Thêm / sửa / xoá =====================

    public async Task<ServiceResult<BusDetailDto>> CreateBusAsync(BusRequest request, CancellationToken ct)
    {
        var layoutError = ValidateLayout(request);
        if (layoutError is not null) return ServiceResult<BusDetailDto>.Fail(ServiceError.Invalid, layoutError);

        var plate = NormalizePlate(request.PlateNumber);
        if (await db.Buses.AnyAsync(b => b.PlateNumber == plate, ct))
            return ServiceResult<BusDetailDto>.Fail(ServiceError.Conflict, $"Biển số {plate} đã tồn tại.");

        var bus = new Bus { PlateNumber = plate, Capacity = request.Capacity, Status = request.Status };
        foreach (var (row, col) in LayoutOf(request.Capacity, request.Columns))
            bus.Seats.Add(new Seat { SeatCode = SeatCodeOf(row, col), SeatRow = row, SeatCol = col });

        db.Buses.Add(bus);
        await db.SaveChangesAsync(ct);
        return ServiceResult<BusDetailDto>.Success(await BuildDetailAsync(bus, ct));
    }

    public async Task<ServiceResult<BusDetailDto>> UpdateBusAsync(long id, BusRequest request, CancellationToken ct)
    {
        var layoutError = ValidateLayout(request);
        if (layoutError is not null) return ServiceResult<BusDetailDto>.Fail(ServiceError.Invalid, layoutError);

        var bus = await db.Buses.Include(b => b.Seats).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bus is null) return ServiceResult<BusDetailDto>.Fail(ServiceError.NotFound, "Không tìm thấy xe buýt.");

        var plate = NormalizePlate(request.PlateNumber);
        if (await db.Buses.AnyAsync(b => b.Id != id && b.PlateNumber == plate, ct))
            return ServiceResult<BusDetailDto>.Fail(ServiceError.Conflict, $"Biển số {plate} đã tồn tại.");

        var wanted = LayoutOf(request.Capacity, request.Columns)
            .ToDictionary(c => SeatCodeOf(c.Row, c.Col), c => c);

        // Chỉ đụng tới ghế khi sơ đồ thực sự đổi. Ghế đã có vé (kể cả vé hết hạn / đã hủy)
        // không được xoá vì Ticket tham chiếu tới Seat.
        var removed = bus.Seats.Where(s => !wanted.ContainsKey(s.SeatCode)).ToList();
        if (removed.Count > 0)
        {
            var removedIds = removed.Select(s => s.Id).ToList();
            if (await db.Tickets.AnyAsync(t => removedIds.Contains(t.SeatId), ct))
                return ServiceResult<BusDetailDto>.Fail(ServiceError.Conflict,
                    "Không thể thu nhỏ sơ đồ ghế vì có ghế bị bỏ đã từng bán vé.");
            db.Seats.RemoveRange(removed);
        }

        var existing = bus.Seats.Where(s => wanted.ContainsKey(s.SeatCode)).ToDictionary(s => s.SeatCode);
        foreach (var (code, cell) in wanted)
        {
            if (existing.TryGetValue(code, out var seat))
            {
                seat.SeatRow = cell.Row;
                seat.SeatCol = cell.Col;
            }
            else
            {
                bus.Seats.Add(new Seat { SeatCode = code, SeatRow = cell.Row, SeatCol = cell.Col });
            }
        }

        bus.PlateNumber = plate;
        bus.Capacity = request.Capacity;
        bus.Status = request.Status;

        await db.SaveChangesAsync(ct);
        return ServiceResult<BusDetailDto>.Success(await BuildDetailAsync(bus, ct));
    }

    public async Task<ServiceResult<bool>> DeleteBusAsync(long id, CancellationToken ct)
    {
        var bus = await db.Buses.Include(b => b.Seats).FirstOrDefaultAsync(b => b.Id == id, ct);
        if (bus is null) return ServiceResult<bool>.Fail(ServiceError.NotFound, "Không tìm thấy xe buýt.");

        // Trip.BusId là SetNull nên xoá xe sẽ âm thầm gỡ xe khỏi mọi chuyến. Chặn lại.
        if (await db.Trips.AnyAsync(t => t.BusId == id, ct))
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                "Xe đã được xếp vào chuyến nên không thể xoá. Hãy chuyển trạng thái sang Ngừng hoạt động.");

        // Vé cũ vẫn tham chiếu ghế dù chuyến đã gỡ xe, xoá ghế sẽ vi phạm khoá ngoại.
        var seatIds = bus.Seats.Select(s => s.Id).ToList();
        if (await db.Tickets.AnyAsync(t => seatIds.Contains(t.SeatId), ct))
            return ServiceResult<bool>.Fail(ServiceError.Conflict,
                "Xe có ghế đã từng bán vé nên không thể xoá. Hãy chuyển trạng thái sang Ngừng hoạt động.");

        db.Seats.RemoveRange(bus.Seats);
        db.Buses.Remove(bus);
        await db.SaveChangesAsync(ct);
        return ServiceResult<bool>.Success(true);
    }
}
