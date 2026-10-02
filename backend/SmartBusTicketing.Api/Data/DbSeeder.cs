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

    public static async Task SeedAssignmentsAsync(WebApplication app, CancellationToken ct = default)
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DbSeeder));

        try
        {
            await db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS `bus_assignments` (
                    `Id` BIGINT NOT NULL AUTO_INCREMENT,
                    `AssignmentCode` VARCHAR(50) NOT NULL,
                    `RouteId` BIGINT NOT NULL,
                    `BusPlate` VARCHAR(50) NOT NULL,
                    `DriverId` VARCHAR(50) NOT NULL,
                    `DriverName` VARCHAR(150) NOT NULL,
                    `AssistantId` VARCHAR(50) NULL,
                    `AssistantName` VARCHAR(150) NULL,
                    `Date` DATE NOT NULL,
                    `Shift` VARCHAR(50) NOT NULL,
                    `ShiftHours` VARCHAR(100) NOT NULL,
                    `StartTime` DATETIME NOT NULL,
                    `EndTime` DATETIME NOT NULL,
                    `Status` VARCHAR(50) NOT NULL,
                    `Notes` TEXT NULL,
                    `CreatedAt` DATETIME NOT NULL,
                    `UpdatedAt` DATETIME NOT NULL,
                    PRIMARY KEY (`Id`),
                    KEY `IX_bus_assignments_AssignmentCode` (`AssignmentCode`),
                    KEY `IX_bus_assignments_BusPlate_Date` (`BusPlate`, `Date`),
                    KEY `IX_bus_assignments_DriverId_Date` (`DriverId`, `Date`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;", ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Chưa thực thi được lệnh tạo bảng bus_assignments nếu không có quyền DDL.");
        }

        try
        {
            if (await db.BusAssignments.AnyAsync(ct)) return;

            var route1 = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == "RT-01" || r.Code == "T01", ct);
            var route2 = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == "RT-02" || r.Code == "T02", ct);
            var route3 = await db.BusRoutes.FirstOrDefaultAsync(r => r.Code == "RT-03" || r.Code == "T03", ct);

            long r1Id = route1?.Id ?? 1;
            long r2Id = route2?.Id ?? 2;
            long r3Id = route3?.Id ?? 3;

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var initial = new List<BusAssignment>
            {
                new()
                {
                    AssignmentCode = "ASN-001",
                    RouteId = r1Id,
                    BusPlate = "51B-184.22",
                    DriverId = "USR-003",
                    DriverName = "Lê Thị Mai",
                    AssistantId = "USR-002",
                    AssistantName = "Trần Minh Đức",
                    Date = today,
                    Shift = "CA_SANG",
                    ShiftHours = "05:00 — 13:30",
                    StartTime = today.ToDateTime(new TimeOnly(5, 0)),
                    EndTime = today.ToDateTime(new TimeOnly(13, 30)),
                    Status = "IN_PROGRESS",
                    Notes = "Phân công vận hành phiên trực chính tuyến 01",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                },
                new()
                {
                    AssignmentCode = "ASN-002",
                    RouteId = r2Id,
                    BusPlate = "51B-221.78",
                    DriverId = "USR-006",
                    DriverName = "Bùi Tuấn Anh",
                    AssistantId = "USR-005",
                    AssistantName = "Hoàng Văn Thắng",
                    Date = today,
                    Shift = "CA_CHIEU",
                    ShiftHours = "13:30 — 21:30",
                    StartTime = today.ToDateTime(new TimeOnly(13, 30)),
                    EndTime = today.ToDateTime(new TimeOnly(21, 30)),
                    Status = "ASSIGNED",
                    Notes = "Phục vụ ca chiều tuyến Bến Thành - Miền Tây",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                },
                new()
                {
                    AssignmentCode = "ASN-003",
                    RouteId = r3Id,
                    BusPlate = "51B-302.15",
                    DriverId = "USR-001",
                    DriverName = "Nguyễn Văn An",
                    AssistantId = "USR-006",
                    AssistantName = "Bùi Tuấn Anh",
                    Date = today,
                    Shift = "CA_SANG",
                    ShiftHours = "05:00 — 13:30",
                    StartTime = today.ToDateTime(new TimeOnly(5, 0)),
                    EndTime = today.ToDateTime(new TimeOnly(13, 30)),
                    Status = "IN_PROGRESS",
                    Notes = "Tăng cường giờ cao điểm xe sinh viên ĐHQG",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                }
            };

            db.BusAssignments.AddRange(initial);
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Đã khởi tạo dữ liệu phân công mẫu.");
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Bỏ qua khởi tạo dữ liệu mẫu phân công.");
        }
    }
}
