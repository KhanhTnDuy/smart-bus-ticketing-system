using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<SmartBusDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SmartBusDbContext>();
    db.Database.EnsureCreated();
    SeedData.Initialize(db);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Frontend");
app.UseHttpsRedirection();
app.MapControllers();

app.MapGet("/", () => Results.Ok(new
{
    service = "Smart Bus Ticketing System API",
    version = "Sprint 2",
    status = "running",
    endpoints = new
    {
        schedules = "/api/schedules",
        trips = "/api/trips",
        buses = "/api/buses",
        assignments = "/api/assignments",
        seats = "/api/trips/{tripId}/seats"
    }
}));

app.Run();
