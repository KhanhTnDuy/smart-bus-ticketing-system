using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddScoped<IRouteManagementService, RouteManagementService>();
builder.Services.AddScoped<IBusManagementService, BusManagementService>();
builder.Services.AddScoped<ITripService, TripService>();
builder.Services.AddScoped<ITripAssignmentService, TripAssignmentService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddSingleton<JwtTokenService>();

// Xác thực là bắt buộc: thiếu khóa thì dừng ngay khi khởi động, thay vì để mọi
// endpoint có [Authorize] trả HTTP 500 với "No authenticationScheme was specified".
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "Thiếu cấu hình 'Jwt:Key' hoặc khóa ngắn hơn 32 byte. " +
        "Đặt qua biến môi trường Jwt__Key, dotnet user-secrets, hoặc appsettings.Development.json.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    // Giữ nguyên tên claim "role"/"name" trong token; nếu không, .NET đổi "role" thành URI dài và [Authorize(Roles=...)] luôn 403.
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromSeconds(30),
        RoleClaimType = JwtTokenService.RoleClaim,
        NameClaimType = JwtTokenService.NameClaim
    };
});
builder.Services.AddAuthorization();

// Frontend Vite chạy ở origin khác nên cần CORS để gọi được API.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:8080"];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()));

var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' not found.");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 0))));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    // Ngoài môi trường dev thì trả ProblemDetails, không để lộ stack trace ra client.
    app.UseExceptionHandler();
}

app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

await DbSeeder.SeedAdminAsync(app);
if (app.Environment.IsDevelopment())
{
    await DbSeeder.SeedAssignmentSampleDataAsync(app);
}

app.Run();
