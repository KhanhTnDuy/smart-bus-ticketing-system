using Microsoft.EntityFrameworkCore;
using SmartBus.Api.Models;

namespace SmartBus.Api.Data;

public class SmartBusDbContext : DbContext
{
    public SmartBusDbContext(DbContextOptions<SmartBusDbContext> options) : base(options) { }

    public DbSet<Route> Routes => Set<Route>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Bus> Buses => Set<Bus>();
    public DbSet<BusSeat> BusSeats => Set<BusSeat>();
    public DbSet<Driver> Drivers => Set<Driver>();
    public DbSet<Assistant> Assistants => Set<Assistant>();
    public DbSet<TripAssignment> TripAssignments => Set<TripAssignment>();
    public DbSet<SeatReservation> SeatReservations => Set<SeatReservation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Route>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Bus>().HasIndex(x => x.PlateNumber).IsUnique();
        modelBuilder.Entity<Driver>().HasIndex(x => x.LicenseNumber).IsUnique();
        modelBuilder.Entity<Assistant>().HasIndex(x => x.EmployeeCode).IsUnique();

        modelBuilder.Entity<Schedule>()
            .HasIndex(x => new { x.RouteName, x.StartTime, x.EndTime });

        modelBuilder.Entity<Schedule>()
            .HasOne(x => x.Route)
            .WithMany()
            .HasForeignKey(x => x.RouteId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Trip>()
            .HasIndex(x => x.DepartureTime);

        modelBuilder.Entity<Trip>()
            .HasIndex(x => new { x.ScheduleId, x.DepartureTime })
            .IsUnique();

        modelBuilder.Entity<BusSeat>()
            .HasIndex(x => new { x.BusId, x.SeatNumber })
            .IsUnique();

        modelBuilder.Entity<SeatReservation>()
            .HasIndex(x => new { x.TripId, x.SeatNumber })
            .IsUnique();

        modelBuilder.Entity<TripAssignment>()
            .HasIndex(x => x.TripId)
            .IsUnique();

        modelBuilder.Entity<TripAssignment>()
            .HasOne(x => x.Trip).WithOne(x => x.Assignment)
            .HasForeignKey<TripAssignment>(x => x.TripId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TripAssignment>()
            .HasOne(x => x.Bus).WithMany()
            .HasForeignKey(x => x.BusId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TripAssignment>()
            .HasOne(x => x.Driver).WithMany()
            .HasForeignKey(x => x.DriverId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TripAssignment>()
            .HasOne(x => x.Assistant).WithMany()
            .HasForeignKey(x => x.AssistantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
