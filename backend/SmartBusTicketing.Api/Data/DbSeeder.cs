using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Data;

/// <summary>
/// Tạo tài khoản quản trị đầu tiên khi cơ sở dữ liệu chưa có Admin nào.
///
/// Không có bước này thì database mới dựng không đăng nhập được: mọi endpoint
/// tạo tài khoản đều yêu cầu vai trò Admin, mà muốn có Admin thì lại phải gọi
/// chính endpoint đó.
///
/// Mật khẩu không nằm trong mã nguồn. Đặt qua `Seed:AdminPassword`, thường là
/// biến môi trường `Seed__AdminPassword` hoặc dotnet user-secrets. Riêng môi
/// trường Development, nếu không đặt thì dùng một mật khẩu mặc định và ghi cảnh
/// báo ra log để người chạy biết mà đổi.
/// </summary>
public static class DbSeeder
{
    public const string DefaultAdminUsername = "admin";

    /// <summary>Chỉ dùng khi chạy Development và chưa cấu hình Seed:AdminPassword.</summary>
    private const string DevelopmentFallbackPassword = "Admin@12345";

    public static async Task SeedAdminAsync(WebApplication app, CancellationToken ct = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        bool hasAdmin;
        try
        {
            hasAdmin = await db.Accounts.AnyAsync(a => a.Role == AccountRole.Admin, ct);
        }
        catch (Exception ex)
        {
            // Chưa chạy migration hoặc chưa kết nối được thì để ứng dụng vẫn khởi
            // động; /api/health sẽ báo database không sẵn sàng.
            logger.LogWarning(ex, "Bỏ qua khởi tạo tài khoản quản trị: chưa đọc được bảng accounts.");
            return;
        }

        if (hasAdmin) return;

        var username = app.Configuration["Seed:AdminUsername"] ?? DefaultAdminUsername;
        var password = app.Configuration["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(password))
        {
            if (!app.Environment.IsDevelopment())
            {
                logger.LogError(
                    "Chưa có tài khoản quản trị nào và cũng chưa đặt Seed:AdminPassword. " +
                    "Đặt biến môi trường Seed__AdminPassword rồi khởi động lại, nếu không sẽ không đăng nhập được.");
                return;
            }

            password = DevelopmentFallbackPassword;
            logger.LogWarning(
                "Tạo tài khoản quản trị '{Username}' bằng mật khẩu mặc định của môi trường Development. " +
                "Hãy đổi mật khẩu này, và đặt Seed__AdminPassword ở mọi môi trường khác.",
                username);
        }

        // Có thể đã tồn tại tài khoản trùng tên nhưng khác vai trò.
        if (await db.Accounts.AnyAsync(a => a.Username == username, ct))
        {
            logger.LogError(
                "Không tạo được tài khoản quản trị: tên đăng nhập '{Username}' đã được dùng cho một vai trò khác. " +
                "Đặt Seed:AdminUsername sang tên khác.",
                username);
            return;
        }

        var now = DateTime.UtcNow;
        db.Accounts.Add(new Account
        {
            Username = username,
            PasswordHash = PasswordService.Hash(password),
            FullName = "Quản trị hệ thống",
            Role = AccountRole.Admin,
            Active = true,
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Đã tạo tài khoản quản trị đầu tiên: '{Username}'.", username);
    }

    /// <summary>
    /// Dữ liệu mẫu phục vụ phát triển & kiểm thử chức năng Phân công xe và nhân sự (SCRUM-50).
    /// Chỉ khởi tạo ở môi trường Development khi database chưa có dữ liệu chuyến chạy.
    /// Giữ nguyên vẹn toàn bộ hàm SeedAdminAsync ban đầu của dự án.
    /// </summary>
    public static async Task SeedAssignmentSampleDataAsync(WebApplication app, CancellationToken ct = default)
    {
        if (!app.Environment.IsDevelopment()) return;

        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        try
        {
            var now = DateTime.UtcNow;

            // 1. Tạo tài khoản Manager, Driver, Conductor nếu chưa có
            if (!await db.Accounts.AnyAsync(a => a.Role == AccountRole.Manager, ct))
            {
                db.Accounts.Add(new Account
                {
                    Username = "manager",
                    PasswordHash = PasswordService.Hash(DevelopmentFallbackPassword),
                    FullName = "Nguyễn Quản Lý",
                    Phone = "0981112233",
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
                        PasswordHash = PasswordService.Hash(DevelopmentFallbackPassword),
                        FullName = "Nguyễn Văn Tuấn",
                        Phone = "0901234567",
                        Role = AccountRole.Driver,
                        Active = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Account
                    {
                        Username = "driver2",
                        PasswordHash = PasswordService.Hash(DevelopmentFallbackPassword),
                        FullName = "Trần Đình Trọng",
                        Phone = "0908765432",
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
                        PasswordHash = PasswordService.Hash(DevelopmentFallbackPassword),
                        FullName = "Trần Minh Đức",
                        Phone = "0902234567",
                        Role = AccountRole.Conductor,
                        Active = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Account
                    {
                        Username = "conductor2",
                        PasswordHash = PasswordService.Hash(DevelopmentFallbackPassword),
                        FullName = "Lê Hoàng Nam",
                        Phone = "0903344556",
                        Role = AccountRole.Conductor,
                        Active = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                );
            }

            await db.SaveChangesAsync(ct);

            // 2. Tạo xe buýt mẫu nếu chưa có
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
                logger.LogInformation("Đã khởi tạo xe buýt mẫu cho kiểm thử.");
            }

            // 3. Tạo tuyến đường & trạm mẫu nếu chưa có
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

                db.BusRoutes.Add(route1);
                await db.SaveChangesAsync(ct);

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

            // 4. Tạo chuyến chạy & phân công mẫu nếu chưa có
            if (!await db.Trips.AnyAsync(ct))
            {
                var route = await db.BusRoutes.FirstAsync(ct);
                var bus1 = await db.Buses.FirstOrDefaultAsync(b => b.Status == BusStatus.Active, ct);
                var bus2 = await db.Buses.Where(b => b.Status == BusStatus.Active).Skip(1).FirstOrDefaultAsync(ct);
                var driver1 = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Driver, ct);
                var conductor1 = await db.Accounts.FirstOrDefaultAsync(a => a.Role == AccountRole.Conductor, ct);

                // Giờ khởi hành dưới đây là giờ Việt Nam (UTC+7), còn trips.DepartureAt lưu UTC nên phải trừ 7 giờ.
                var vietnamOffset = TimeSpan.FromHours(7);
                var today = (DateTime.UtcNow + vietnamOffset).Date;

                // Chuyến 1: Đã phân công đầy đủ xe, tài xế, phụ xe
                var trip1 = new Trip
                {
                    RouteId = route.Id,
                    BusId = bus1?.Id,
                    DepartureAt = today.AddHours(7).AddMinutes(30) - vietnamOffset,
                    Status = TripStatus.Scheduled,
                    DelayMinutes = 0
                };

                // Chuyến 2: Đã phân công xe
                var trip2 = new Trip
                {
                    RouteId = route.Id,
                    BusId = bus2?.Id,
                    DepartureAt = today.AddHours(10).AddMinutes(0) - vietnamOffset,
                    Status = TripStatus.Scheduled,
                    DelayMinutes = 0
                };

                // Chuyến 3: Chưa phân công phương tiện hay nhân sự
                var trip3 = new Trip
                {
                    RouteId = route.Id,
                    BusId = null,
                    DepartureAt = today.AddHours(14).AddMinutes(30) - vietnamOffset,
                    Status = TripStatus.Scheduled,
                    DelayMinutes = 0
                };

                db.Trips.AddRange(trip1, trip2, trip3);
                await db.SaveChangesAsync(ct);

                if (driver1 != null)
                {
                    db.TripStaff.Add(new TripStaff
                    {
                        TripId = trip1.Id,
                        AccountId = driver1.Id,
                        Duty = StaffDuty.Driver
                    });
                }

                if (conductor1 != null)
                {
                    db.TripStaff.Add(new TripStaff
                    {
                        TripId = trip1.Id,
                        AccountId = conductor1.Id,
                        Duty = StaffDuty.Conductor
                    });
                }

                await db.SaveChangesAsync(ct);
                logger.LogInformation("Đã khởi tạo các chuyến chạy và phân công mẫu (SCRUM-50).");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bỏ qua khởi tạo dữ liệu mẫu phân công xe & nhân sự: {Message}", ex.Message);
        }
    }
}
