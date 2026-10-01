using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// Phát JWT cho tài khoản đã đăng nhập.
///
/// Tên claim phải khớp với cấu hình xác thực trong Program.cs: ở đó đặt
/// MapInboundClaims = false, RoleClaimType = "role" và NameClaimType = "name",
/// nên token cũng dùng đúng hai tên claim ngắn đó thay vì URI dài của .NET.
/// </summary>
public sealed class JwtTokenService
{
    public const string RoleClaim = "role";
    public const string NameClaim = "name";

    private readonly byte[] _key;
    private readonly string? _issuer;
    private readonly string? _audience;
    private readonly TimeSpan _lifetime;

    public JwtTokenService(IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new InvalidOperationException(
                "Thiếu cấu hình 'Jwt:Key' hoặc khóa ngắn hơn 32 byte. " +
                "Đặt qua biến môi trường Jwt__Key, user-secrets, hoặc appsettings.Development.json.");
        }

        _key = Encoding.UTF8.GetBytes(key);
        _issuer = configuration["Jwt:Issuer"];
        _audience = configuration["Jwt:Audience"];
        _lifetime = TimeSpan.FromMinutes(configuration.GetValue("Jwt:AccessTokenMinutes", 120));
    }

    public int ExpiresInSeconds => (int)_lifetime.TotalSeconds;

    public string CreateAccessToken(Account account)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, account.Id.ToString()),
            new(NameClaim, account.Username),
            new(RoleClaim, account.Role.ToString()),
        };

        if (!string.IsNullOrWhiteSpace(account.Email)) claims.Add(new Claim("email", account.Email));

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.Add(_lifetime),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(_key), SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static class JwtRegisteredClaimNames
    {
        public const string Sub = "sub";
    }
}

/// <summary>Đọc danh tính người thực hiện từ JWT đã xác thực, thay cho header X-User-Id / X-Username cũ.</summary>
public static class ClaimsPrincipalExtensions
{
    public static long? AccountId(this ClaimsPrincipal? user)
    {
        var raw = user?.FindFirst("sub")?.Value ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return long.TryParse(raw, out var id) ? id : null;
    }

    public static string? Username(this ClaimsPrincipal? user) =>
        user?.FindFirst(JwtTokenService.NameClaim)?.Value ?? user?.Identity?.Name;

    public static bool IsInAppRole(this ClaimsPrincipal? user, AccountRole role) =>
        user?.FindFirst(JwtTokenService.RoleClaim)?.Value == role.ToString();
}
