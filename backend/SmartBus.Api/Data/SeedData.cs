using SmartBus.Api.Models;

namespace SmartBus.Api.Data;

public static class SeedData
{
    public static void Initialize(SmartBusDbContext db)
    {
        if (db.Routes.Any()) return;

        var route = new Route
        {
            Code = "R01",
            Name = "Tuyến 01",
            StartPoint = "Bến xe Thái Nguyên",
            EndPoint = "Đại học CNTT",
            Active = true
        };
        db.Routes.Add(route);

        var bus1 = new Bus { Code = "BUS-01", PlateNumber = "20A-12345", SeatRows = 5, SeatColumns = 4, Active = true };
        var bus2 = new Bus { Code = "BUS-02", PlateNumber = "20A-67890", SeatRows = 5, SeatColumns = 4, Active = true };
        db.Buses.AddRange(bus1, bus2);

        db.Drivers.AddRange(
            new Driver { FullName = "Nguyễn Văn An", LicenseNumber = "D001", Active = true },
            new Driver { FullName = "Trần Văn Bình", LicenseNumber = "D002", Active = true });

        db.Assistants.AddRange(
            new Assistant { FullName = "Lê Văn Cường", EmployeeCode = "A001", Active = true },
            new Assistant { FullName = "Phạm Văn Dũng", EmployeeCode = "A002", Active = true });

        db.SaveChanges();
        AddSeats(db, bus1);
        AddSeats(db, bus2);

        var schedule = new Schedule
        {
            RouteId = route.Id,
            RouteName = route.Name,
            StartPoint = route.StartPoint,
            EndPoint = route.EndPoint,
            StartTime = new TimeSpan(6, 0, 0),
            EndTime = new TimeSpan(18, 0, 0),
            FrequencyMinutes = 30,
            DaysOfWeek = "MON,TUE,WED,THU,FRI,SAT",
            Fare = 10000,
            Active = true
        };
        db.Schedules.Add(schedule);
        db.SaveChanges();
    }

    private static void AddSeats(SmartBusDbContext db, Bus bus)
    {
        for (var row = 1; row <= bus.SeatRows; row++)
            for (var col = 1; col <= bus.SeatColumns; col++)
                db.BusSeats.Add(new BusSeat { BusId = bus.Id, SeatNumber = $"{(char)('A' + row - 1)}{col}" });
        db.SaveChanges();
    }
}
