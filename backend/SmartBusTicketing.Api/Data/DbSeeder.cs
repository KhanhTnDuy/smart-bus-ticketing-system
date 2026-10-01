using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Data;

/// <summary>
/// Khởi tạo dữ liệu ban đầu cho hệ thống:
/// 1. Tài khoản quản trị đầu tiên (Admin)
/// 2. Dữ liệu mẫu phục vụ phát triển (Development): Manager, Driver, Conductor, Buses, Routes, Trips và phân công mẫu.
/// </summary>
public static class DbSeeder
{
    public const string DefaultAdminUsername = "admin";
    private const string DevelopmentFallbackPassword = "Admin@12345";

    public static async Task SeedAdminAsync(WebApplication app, CancellationToken ct = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        try
        {
            var hasAdmin = await db.Accounts.AnyAsync(a => a.Role == AccountRole.Admin, ct);
            if (!hasAdmin)
            {
                var username = app.Configuration["Seed:AdminUsername"] ?? DefaultAdminUsername;
                var password = app.Configuration["Seed:AdminPassword"];

                if (string.IsNullOrWhiteSpace(password))
                {
                    if (!app.Environment.IsDevelopment())
                    {
                        logger.LogError("Chưa có tài khoản quản trị nào và chưa đặt Seed:AdminPassword.");
                        return;
                    }
                    password = DevelopmentFallbackPassword;
                }

                if (!await db.Accounts.AnyAsync(a => a.Username == username, ct))
                {
                    var now = DateTime.UtcNow;
                    db.Accounts.Add(new Account
                    {
                        Username = username,
                        PasswordHash = PasswordService.Hash(password),
                        FullName = "Quản trị hệ thống",
                        Email = "admin@smartbus.local",
                        Phone = "0900000000",
                        Role = AccountRole.Admin,
                        Active = true,
                        CreatedAt = now,
                        UpdatedAt = now,
                    });
                    await db.SaveChangesAsync(ct);
                    logger.LogInformation("Đã tạo tài khoản quản trị: '{Username}'.", username);
                }
            }

            // Trong môi trường Development, nạp thêm dữ liệu mẫu nếu bảng còn trống
            if (app.Environment.IsDevelopment())
            {
                await SeedDevelopmentDataAsync(db, logger, ct);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bỏ qua khởi tạo dữ liệu mẫu: chưa kết nối được database hoặc chưa chạy migration.");
        }
    }

    private static async Task SeedDevelopmentDataAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        // 1. Seed nhân viên: Manager, Drivers, Conductors
        if (!await db.Accounts.AnyAsync(a => a.Role == AccountRole.Manager, ct))
        {
            db.Accounts.Add(new Account
            {
                Username = "manager",
                PasswordHash = PasswordService.Hash("Manager@12345"),
                FullName = "Nguyễn Quản Lý",
                Email = "manager@smartbus.local",
                Phone = "0901111111",
                Role = AccountRole.Manager,
                Active = true,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        if (!await db.Accounts.AnyAsync(a => a.Role == AccountRole.Driver, ct))
        {
            db.Accounts.AddRange(
                new Account
                {
                    Username = "driver1",
                    PasswordHash = PasswordService.Hash("Driver@12345"),
                    FullName = "Nguyễn Văn Tuấn",
                    Email = "driver1@smartbus.local",
                    Phone = "0901234567",
                    Role = AccountRole.Driver,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Account
                {
                    Username = "driver2",
                    PasswordHash = PasswordService.Hash("Driver@12345"),
                    FullName = "Lê Thị Mai",
                    Email = "driver2@smartbus.local",
                    Phone = "0901234568",
                    Role = AccountRole.Driver,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Account
                {
                    Username = "driver3",
                    PasswordHash = PasswordService.Hash("Driver@12345"),
                    FullName = "Bùi Tuấn Anh",
                    Email = "driver3@smartbus.local",
                    Phone = "0901234569",
                    Role = AccountRole.Driver,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }
            );
        }

        if (!await db.Accounts.AnyAsync(a => a.Role == AccountRole.Conductor, ct))
        {
            db.Accounts.AddRange(
                new Account
                {
                    Username = "conductor1",
                    PasswordHash = PasswordService.Hash("Conductor@12345"),
                    FullName = "Trần Minh Đức",
                    Email = "conductor1@smartbus.local",
                    Phone = "0902234567",
                    Role = AccountRole.Conductor,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new Account
                {
                    Username = "conductor2",
                    PasswordHash = PasswordService.Hash("Conductor@12345"),
                    FullName = "Lê Hoàng Nam",
                    Email = "conductor2@smartbus.local",
                    Phone = "0902234568",
                    Role = AccountRole.Conductor,
                    Active = true,
                    CreatedAt = now,
                    UpdatedAt = now
                }
            );
        }

        await db.SaveChangesAsync(ct);

        // 2. Seed Xe buýt (Buses)
        if (!await db.Buses.AnyAsync(ct))
        {
            var busPlates = new[]
            {
                ("51B-184.22", 47, BusStatus.Active),
                ("51B-221.78", 47, BusStatus.Active),
                ("51B-302.15", 24, BusStatus.Active),
                ("51B-998.01", 24, BusStatus.Active),
                ("51B-201.55", 47, BusStatus.Maintenance)
            };

            foreach (var (plate, capacity, status) in busPlates)
            {
                var bus = new Bus
                {
                    PlateNumber = plate,
                    Capacity = capacity,
                    Status = status
                };

                for (int i = 1; i <= capacity; i++)
                {
                    char row = (char)('A' + ((i - 1) % 4));
                    int col = ((i - 1) / 4) + 1;
                    bus.Seats.Add(new Seat
                    {
                        SeatCode = $"{row}{col}",
                        SeatRow = col,
                        SeatCol = (i - 1) % 4 + 1
                    });
                }

                db.Buses.Add(bus);
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Đã khởi tạo danh sách xe buýt mẫu.");
        }

        // 3. Seed Tuyến xe buýt (Routes) nếu chưa có
        if (!await db.BusRoutes.AnyAsync(ct))
        {
            var route1 = new BusRoute
            {
                Code = "T01",
                Name = "Bến Thành — Bến xe Miền Tây",
                StartPoint = "Công viên 23/9 (Bến Thành)",
                EndPoint = "Bến xe Miền Tây",
                DistanceKm = 14.5m,
                Active = true
            };

            var route2 = new BusRoute
            {
                Code = "T02",
                Name = "Bến Thành — Bến xe Miền Đông",
                StartPoint = "Công viên 23/9 (Bến Thành)",
                EndPoint = "Bến xe Miền Đông",
                DistanceKm = 12.0m,
                Active = true
            };

            db.BusRoutes.AddRange(route1, route2);
            await db.SaveChangesAsync(ct);

            // Thêm trạm dừng mẫu cho Route 1
            var stop1 = new Stop { Name = "Công viên 23/9", Latitude = 10.7686m, Longitude = 106.6942m };
            var stop2 = new Stop { Name = "Chợ Bến Thành", Latitude = 10.7725m, Longitude = 106.6980m };
            var stop3 = new Stop { Name = "Bệnh viện Chợ Rẫy", Latitude = 10.7578m, Longitude = 106.6596m };
            var stop4 = new Stop { Name = "Bến xe Miền Tây", Latitude = 10.7411m, Longitude = 106.6186m };

            db.Stops.AddRange(stop1, stop2, stop3, stop4);
            await db.SaveChangesAsync(ct);

            db.RouteStops.AddRange(
                new RouteStop { RouteId = route1.Id, StopId = stop1.Id, StopOrder = 1, MinutesFromStart = 0 },
                new RouteStop { RouteId = route1.Id, StopId = stop2.Id, StopOrder = 2, MinutesFromStart = 10 },
                new RouteStop { RouteId = route1.Id, StopId = stop3.Id, StopOrder = 3, MinutesFromStart = 30 },
                new RouteStop { RouteId = route1.Id, StopId = stop4.Id, StopOrder = 4, MinutesFromStart = 50 }
            );
            await db.SaveChangesAsync(ct);
        }

        // 4. Seed Chuyến chạy (Trips) và Phân công (TripStaff) nếu chưa có
        if (!await db.Trips.AnyAsync(ct))
        {
            var route1 = await db.BusRoutes.FirstAsync(r => r.Code == "T01", ct);
            var bus1 = await db.Buses.FirstOrDefaultAsync(b => b.PlateNumber == "51B-184.22", ct);
            var bus2 = await db.Buses.FirstOrDefaultAsync(b => b.PlateNumber == "51B-221.78", ct);
            var driver1 = await db.Accounts.FirstOrDefaultAsync(a => a.Username == "driver1", ct);
            var driver2 = await db.Accounts.FirstOrDefaultAsync(a => a.Username == "driver2", ct);
            var conductor1 = await db.Accounts.FirstOrDefaultAsync(a => a.Username == "conductor1", ct);
            var conductor2 = await db.Accounts.FirstOrDefaultAsync(a => a.Username == "conductor2", ct);

            var today = DateTime.UtcNow.Date;

            // Chuyến 1: Đã phân công đầy đủ xe, tài xế, phụ xe
            var trip1 = new Trip
            {
                RouteId = route1.Id,
                BusId = bus1?.Id,
                DepartureAt = today.AddHours(7).AddMinutes(30),
                Status = TripStatus.Scheduled,
                DelayMinutes = 0
            };

            // Chuyến 2: Đã phân công xe và tài xế
            var trip2 = new Trip
            {
                RouteId = route1.Id,
                BusId = bus2?.Id,
                DepartureAt = today.AddHours(9).AddMinutes(0),
                Status = TripStatus.Scheduled,
                DelayMinutes = 0
            };

            // Chuyến 3: Chưa phân công xe hoặc nhân sự
            var trip3 = new Trip
            {
                RouteId = route1.Id,
                BusId = null,
                DepartureAt = today.AddHours(14).AddMinutes(30),
                Status = TripStatus.Scheduled,
                DelayMinutes = 0
            };

            db.Trips.AddRange(trip1, trip2, trip3);
            await db.SaveChangesAsync(ct);

            if (driver1 != null)
                db.TripStaff.Add(new TripStaff { TripId = trip1.Id, AccountId = driver1.Id, Duty = StaffDuty.Driver });
            if (conductor1 != null)
                db.TripStaff.Add(new TripStaff { TripId = trip1.Id, AccountId = conductor1.Id, Duty = StaffDuty.Conductor });

            if (driver2 != null)
                db.TripStaff.Add(new TripStaff { TripId = trip2.Id, AccountId = driver2.Id, Duty = StaffDuty.Driver });
            if (conductor2 != null)
                db.TripStaff.Add(new TripStaff { TripId = trip2.Id, AccountId = conductor2.Id, Duty = StaffDuty.Conductor });

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Đã khởi tạo các chuyến chạy và phân công mẫu.");
        }
    }
}
