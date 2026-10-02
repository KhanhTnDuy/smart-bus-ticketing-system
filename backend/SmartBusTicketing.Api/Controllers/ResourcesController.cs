using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Controllers;

[ApiController]
[Route("api/resources")]
[Authorize]
public sealed class ResourcesController(AppDbContext db) : ControllerBase
{
    // Dữ liệu danh mục cho form quản lý lịch/chuyến/phân công.
    [HttpGet]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var routes = await db.BusRoutes.AsNoTracking()
            .Where(r => r.Active)
            .OrderBy(r => r.Code)
            .Select(r => new { r.Id, r.Code, r.Name, r.StartPoint, r.EndPoint })
            .ToListAsync(ct);

        var buses = await db.Buses.AsNoTracking()
            .Where(b => b.Status == BusStatus.Active)
            .OrderBy(b => b.PlateNumber)
            .Select(b => new { b.Id, b.PlateNumber, b.Capacity, b.Status })
            .ToListAsync(ct);

        var drivers = await db.Accounts.AsNoTracking()
            .Where(a => a.Active && a.Role == AccountRole.Driver)
            .OrderBy(a => a.FullName)
            .Select(a => new { a.Id, a.Username, a.FullName, a.Phone })
            .ToListAsync(ct);

        var conductors = await db.Accounts.AsNoTracking()
            .Where(a => a.Active && a.Role == AccountRole.Conductor)
            .OrderBy(a => a.FullName)
            .Select(a => new { a.Id, a.Username, a.FullName, a.Phone })
            .ToListAsync(ct);

        return Ok(new { routes, buses, drivers, conductors });
    }
}
