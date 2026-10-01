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
}
