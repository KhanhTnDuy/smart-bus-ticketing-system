using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/resources")]
public class ResourcesController : ControllerBase
{
    private readonly SmartBusDbContext _db;
    public ResourcesController(SmartBusDbContext db) => _db = db;

    [HttpGet("routes")]
    public async Task<IActionResult> Routes() =>
        Ok(await _db.Routes.AsNoTracking().Where(x => x.Active).OrderBy(x => x.Code).ToListAsync());

    [HttpGet("drivers")]
    public async Task<IActionResult> Drivers() =>
        Ok(await _db.Drivers.AsNoTracking().Where(x => x.Active).OrderBy(x => x.FullName).ToListAsync());

    [HttpGet("assistants")]
    public async Task<IActionResult> Assistants() =>
        Ok(await _db.Assistants.AsNoTracking().Where(x => x.Active).OrderBy(x => x.FullName).ToListAsync());

    [HttpGet("buses")]
    public async Task<IActionResult> Buses() =>
        Ok(await _db.Buses.AsNoTracking().Where(x => x.Active).OrderBy(x => x.Code).ToListAsync());
}
