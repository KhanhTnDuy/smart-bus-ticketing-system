using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;
using SmartBusTicketing.Api.Services.Fares;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Bảng giá vé niêm yết theo số km hành trình. Xem bảng giá và giá từng chặng của tuyến là công khai (niêm yết); thêm, sửa, xóa bậc giá
/// chỉ Admin và Quản lý, mọi thay đổi ghi nhật ký. Các bậc không được chồng lấn nhau.
/// </summary>
[ApiController]
[Route("api/distance-fares")]
public sealed class DistanceFaresController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    private static DistanceFareDto ToDto(DistanceFare b) => new() { Id = b.Id, FromKm = b.FromKm, ToKm = b.ToKm, Price = b.Price };

    private static string Describe(DistanceFare b) =>
        $"{b.FromKm:0.##} đến {(b.ToKm is { } t ? t.ToString("0.##") : "không giới hạn")} km: {b.Price:N0} đ";

    [HttpGet, AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DistanceFareDto>>> GetAll(CancellationToken ct) =>
        Ok(await db.DistanceFares.AsNoTracking().OrderBy(b => b.FromKm).Select(b => ToDto(b)).ToListAsync(ct));

    /// <summary>Giá mọi chặng của một tuyến theo bảng giá km, cho từng đối tượng hành khách.</summary>
    [HttpGet("routes/{routeId:long}"), AllowAnonymous]
    public async Task<ActionResult<RouteFareMatrixDto>> GetRouteMatrix(long routeId, CancellationToken ct)
    {
        var route = await db.BusRoutes.AsNoTracking().Include(r => r.RouteStops).ThenInclude(rs => rs.Stop)
            .FirstOrDefaultAsync(r => r.Id == routeId, ct);
        if (route is null) return NotFound(new { message = "Không tìm thấy tuyến đường." });

        var bands = await db.DistanceFares.AsNoTracking().OrderBy(b => b.FromKm).ToListAsync(ct);
        var types = await db.PassengerTypes.AsNoTracking().OrderBy(p => p.Id).ToListAsync(ct);
        var stops = route.RouteStops.OrderBy(s => s.StopOrder).ToList();

        var legs = new List<FareLegDto>();
        for (var i = 0; i < stops.Count; i++)
        {
            for (var j = i + 1; j < stops.Count; j++)
            {
                var km = FareCalculator.LegKm(stops[i], stops[j]);
                if (km is null) continue;
                var basePrice = FareCalculator.BandPrice(bands, km);
                legs.Add(new FareLegDto
                {
                    FromStopId = stops[i].StopId, FromStopName = stops[i].Stop.Name,
                    ToStopId = stops[j].StopId, ToStopName = stops[j].Stop.Name,
                    DistanceKm = km.Value,
                    Prices = basePrice is null
                        ? []
                        : types.Select(t => new TripPassengerFareDto
                        {
                            PassengerTypeId = t.Id, PassengerTypeCode = t.Code, PassengerTypeName = t.Name,
                            DiscountPercent = t.DiscountPercent, Price = FareCalculator.ApplyDiscount(basePrice.Value, t.DiscountPercent),
                        }).ToList(),
                });
            }
        }

        return Ok(new RouteFareMatrixDto
        {
            RouteId = route.Id, RouteCode = route.Code, RouteName = route.Name, DistanceKm = route.DistanceKm,
            Stops = stops.Select(s => new FareStopDto
            {
                StopId = s.StopId, StopName = s.Stop.Name, StopOrder = s.StopOrder, DistanceFromStartKm = s.DistanceFromStartKm,
            }).ToList(),
            Legs = legs,
        });
    }

    [HttpPost, Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<DistanceFareDto>> Create(DistanceFareRequest request, CancellationToken ct)
    {
        if (await Overlaps(request, null, ct) is { } conflict) return Conflict(new { message = conflict });

        var band = new DistanceFare { FromKm = request.FromKm, ToKm = request.ToKm, Price = request.Price };
        db.DistanceFares.Add(band);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "manager", "Thêm bậc giá theo km", AuditActionType.Create,
            $"DISTANCE-FARE-{band.Id}", AuditStatus.Success, Describe(band), ct);
        return CreatedAtAction(nameof(GetAll), ToDto(band));
    }

    [HttpPut("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<DistanceFareDto>> Update(long id, DistanceFareRequest request, CancellationToken ct)
    {
        var band = await db.DistanceFares.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (band is null) return NotFound(new { message = "Không tìm thấy bậc giá." });
        if (await Overlaps(request, id, ct) is { } conflict) return Conflict(new { message = conflict });

        var before = Describe(band);
        band.FromKm = request.FromKm;
        band.ToKm = request.ToKm;
        band.Price = request.Price;
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "manager", "Sửa bậc giá theo km", AuditActionType.Update,
            $"DISTANCE-FARE-{id}", AuditStatus.Success, $"Trước: {before}; sau: {Describe(band)}", ct);
        return Ok(ToDto(band));
    }

    [HttpDelete("{id:long}"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var band = await db.DistanceFares.FirstOrDefaultAsync(b => b.Id == id, ct);
        if (band is null) return NotFound(new { message = "Không tìm thấy bậc giá." });

        var text = Describe(band);
        db.DistanceFares.Remove(band);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(User.AccountId(), User.Username() ?? "manager", "Xóa bậc giá theo km", AuditActionType.Delete,
            $"DISTANCE-FARE-{id}", AuditStatus.Success, text, ct);
        return NoContent();
    }

    /// <summary>Các bậc (FromKm, ToKm] không được chồng lấn: chồng lấn thì một chặng có hai giá.</summary>
    private async Task<string?> Overlaps(DistanceFareRequest request, long? exceptId, CancellationToken ct)
    {
        var others = await db.DistanceFares.AsNoTracking().Where(b => b.Id != exceptId).ToListAsync(ct);
        var reqTo = request.ToKm ?? decimal.MaxValue;
        var clash = others.FirstOrDefault(b => request.FromKm < (b.ToKm ?? decimal.MaxValue) && b.FromKm < reqTo);
        return clash is null ? null : $"Bậc giá này chồng lấn với bậc đã có ({Describe(clash)}).";
    }
}
