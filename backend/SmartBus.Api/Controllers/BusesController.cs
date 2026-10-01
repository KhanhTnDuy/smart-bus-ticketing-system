using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;
using SmartBus.Api.DTOs;
using SmartBus.Api.Models;

namespace SmartBus.Api.Controllers;

[ApiController]
[Route("api/buses")]
public class BusesController : ControllerBase
{
    private readonly SmartBusDbContext _db;

    public BusesController(SmartBusDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _db.Buses.AsNoTracking().OrderBy(x => x.Code).ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var bus = await _db.Buses.FindAsync(id);
        return bus is null ? NotFound() : Ok(bus);
    }

    [HttpPost]
    public async Task<IActionResult> Create(BusRequest request)
    {
        if (request.SeatRows <= 0 || request.SeatColumns <= 0)
            return BadRequest(new { message = "Số hàng/cột ghế phải lớn hơn 0." });

        if (await _db.Buses.AnyAsync(x => x.Code == request.Code || x.PlateNumber == request.PlateNumber))
            return Conflict(new { message = "Mã xe hoặc biển số đã tồn tại." });

        var bus = new Bus
        {
            Code = request.Code.Trim(),
            PlateNumber = request.PlateNumber.Trim(),
            SeatRows = request.SeatRows,
            SeatColumns = request.SeatColumns,
            Active = request.Active
        };

        _db.Buses.Add(bus);
        await _db.SaveChangesAsync();
        await CreateSeats(bus);

        return CreatedAtAction(nameof(GetById), new { id = bus.Id }, bus);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, BusRequest request)
    {
        var bus = await _db.Buses.FindAsync(id);
        if (bus is null) return NotFound();

        bus.Code = request.Code.Trim();
        bus.PlateNumber = request.PlateNumber.Trim();
        bus.SeatRows = request.SeatRows;
        bus.SeatColumns = request.SeatColumns;
        bus.Active = request.Active;

        await _db.SaveChangesAsync();
        return Ok(bus);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var bus = await _db.Buses.FindAsync(id);
        if (bus is null) return NotFound();

        bus.Active = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task CreateSeats(Bus bus)
    {
        for (var row = 1; row <= bus.SeatRows; row++)
        {
            for (var col = 1; col <= bus.SeatColumns; col++)
            {
                _db.BusSeats.Add(new BusSeat
                {
                    BusId = bus.Id,
                    SeatNumber = $"{(char)('A' + row - 1)}{col}"
                });
            }
        }
        await _db.SaveChangesAsync();
    }
}
