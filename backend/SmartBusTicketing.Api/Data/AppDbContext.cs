using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using SmartBusTicketing.Api.Models;

namespace SmartBusTicketing.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PassengerType> PassengerTypes => Set<PassengerType>();
    public DbSet<PassengerVerification> PassengerVerifications => Set<PassengerVerification>();

    public DbSet<BusRoute> BusRoutes => Set<BusRoute>();
    public DbSet<Stop> Stops => Set<Stop>();
    public DbSet<RouteStop> RouteStops => Set<RouteStop>();
    public DbSet<Fare> Fares => Set<Fare>();
    public DbSet<Bus> Buses => Set<Bus>();
    public DbSet<Seat> Seats => Set<Seat>();
    public DbSet<Schedule> Schedules => Set<Schedule>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<TripStaff> TripStaff => Set<TripStaff>();
    public DbSet<BusAssignment> BusAssignments => Set<BusAssignment>();

    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketChangeRequest> TicketChangeRequests => Set<TicketChangeRequest>();
    public DbSet<TicketScan> TicketScans => Set<TicketScan>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();

    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<Refund> Refunds => Set<Refund>();
    public DbSet<MonthlyPass> MonthlyPasses => Set<MonthlyPass>();

    public DbSet<BusLocation> BusLocations => Set<BusLocation>();
    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<FeedbackHistory> FeedbackHistories => Set<FeedbackHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // --- Accounts ---
        modelBuilder.Entity<Account>(e =>
        {
            e.ToTable("accounts");
            e.HasIndex(a => a.Username).IsUnique();
            e.HasIndex(a => a.Email).IsUnique();
            e.HasIndex(a => a.Phone).IsUnique();
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.HasOne(a => a.Account).WithMany(a => a.AuditLogs)
                .HasForeignKey(a => a.AccountId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(a => new { a.Username, a.ActionType, a.CreatedAt });
        });

        modelBuilder.Entity<PassengerType>(e =>
        {
            e.ToTable("passenger_types");
            e.HasIndex(p => p.Code).IsUnique();
            e.Property(p => p.DiscountPercent).HasPrecision(5, 2);
            // Dữ liệu mặc định (cần có để tạo giá vé và đăng ký ưu đãi).
            e.HasData(
                new PassengerType { Id = 1, Code = "STANDARD", Name = "Hành khách thường", DiscountPercent = 0 },
                new PassengerType { Id = 2, Code = "STUDENT", Name = "Học sinh / Sinh viên", DiscountPercent = 50 },
                new PassengerType { Id = 3, Code = "ELDERLY", Name = "Người cao tuổi", DiscountPercent = 50 },
                new PassengerType { Id = 4, Code = "WORKER", Name = "Người đi làm (vé tháng)", DiscountPercent = 20 });
        });

        modelBuilder.Entity<PassengerVerification>(e =>
        {
            e.ToTable("passenger_verifications");
            e.HasOne(v => v.Account).WithMany(a => a.PassengerVerifications)
                .HasForeignKey(v => v.AccountId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(v => v.PassengerType).WithMany(p => p.PassengerVerifications)
                .HasForeignKey(v => v.PassengerTypeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(v => v.Reviewer).WithMany()
                .HasForeignKey(v => v.ReviewedBy).OnDelete(DeleteBehavior.SetNull);
        });

        // --- Routing ---
        modelBuilder.Entity<BusRoute>(e =>
        {
            e.ToTable("routes");
            e.HasIndex(r => r.Code).IsUnique();
            e.Property(r => r.DistanceKm).HasPrecision(8, 2);
        });

        modelBuilder.Entity<Stop>(e =>
        {
            e.ToTable("stops");
            e.Property(s => s.Latitude).HasPrecision(10, 6);
            e.Property(s => s.Longitude).HasPrecision(10, 6);
        });

        modelBuilder.Entity<RouteStop>(e =>
        {
            e.ToTable("route_stops");
            e.HasKey(rs => new { rs.RouteId, rs.StopId });
            e.HasOne(rs => rs.BusRoute).WithMany(r => r.RouteStops).HasForeignKey(rs => rs.RouteId);
            e.HasOne(rs => rs.Stop).WithMany(s => s.RouteStops).HasForeignKey(rs => rs.StopId);
            e.HasIndex(rs => new { rs.RouteId, rs.StopOrder }).IsUnique();
        });

        modelBuilder.Entity<Fare>(e =>
        {
            e.ToTable("fares");
            e.Property(f => f.Price).HasPrecision(10, 2);
            e.HasOne(f => f.BusRoute).WithMany(r => r.Fares).HasForeignKey(f => f.RouteId);
            e.HasOne(f => f.PassengerType).WithMany(p => p.Fares).HasForeignKey(f => f.PassengerTypeId);
        });

        modelBuilder.Entity<Bus>(e =>
        {
            e.ToTable("buses");
            e.HasIndex(b => b.PlateNumber).IsUnique();
        });

        modelBuilder.Entity<Seat>(e =>
        {
            e.ToTable("seats");
            e.HasOne(s => s.Bus).WithMany(b => b.Seats).HasForeignKey(s => s.BusId);
            e.HasIndex(s => new { s.BusId, s.SeatCode }).IsUnique();
        });

        modelBuilder.Entity<Schedule>(e =>
        {
            e.ToTable("schedules");
            e.HasOne(s => s.BusRoute).WithMany(r => r.Schedules).HasForeignKey(s => s.RouteId);
        });

        modelBuilder.Entity<Trip>(e =>
        {
            e.ToTable("trips");
            e.HasOne(t => t.BusRoute).WithMany(r => r.Trips).HasForeignKey(t => t.RouteId);
            e.HasOne(t => t.Schedule).WithMany(s => s.Trips)
                .HasForeignKey(t => t.ScheduleId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(t => t.Bus).WithMany(b => b.Trips)
                .HasForeignKey(t => t.BusId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(t => new { t.BusId, t.DepartureAt }).IsUnique();
        });

        modelBuilder.Entity<TripStaff>(e =>
        {
            e.ToTable("trip_staff");
            e.HasKey(ts => new { ts.TripId, ts.AccountId });
            e.HasOne(ts => ts.Trip).WithMany(t => t.TripStaff).HasForeignKey(ts => ts.TripId);
            e.HasOne(ts => ts.Account).WithMany().HasForeignKey(ts => ts.AccountId);
        });

        // --- Booking & ticketing ---
        modelBuilder.Entity<Booking>(e =>
        {
            e.ToTable("bookings");
            e.HasIndex(b => b.BookingCode).IsUnique();
            e.Property(b => b.FinalAmount).HasPrecision(12, 2);
            e.HasOne(b => b.Passenger).WithMany(a => a.Bookings)
                .HasForeignKey(b => b.PassengerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.Trip).WithMany(t => t.Bookings)
                .HasForeignKey(b => b.TripId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(b => b.Voucher).WithMany(v => v.Bookings)
                .HasForeignKey(b => b.VoucherId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Ticket>(e =>
        {
            e.ToTable("tickets");
            e.HasIndex(t => t.QrCode).IsUnique();
            e.HasOne(t => t.Booking).WithMany(b => b.Tickets).HasForeignKey(t => t.BookingId);
            e.HasOne(t => t.Trip).WithMany().HasForeignKey(t => t.TripId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.Seat).WithMany(s => s.Tickets).HasForeignKey(t => t.SeatId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.BoardStop).WithMany().HasForeignKey(t => t.BoardStopId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.AlightStop).WithMany().HasForeignKey(t => t.AlightStopId).OnDelete(DeleteBehavior.Restrict);
            // Chống bán trùng ghế: MySQL không hỗ trợ unique index có điều kiện,
            // nên dùng cột sinh tự động (giống schema.sql) = "trip-seat" khi vé đang giữ chỗ, NULL khi đã hủy.
            e.Property<string?>("ActiveSeatKey")
                .HasComputedColumnSql("(CASE WHEN `Status` IN ('Held','Valid','Used') THEN CONCAT(`TripId`, '-', `SeatId`) END)", stored: true);
            e.HasIndex("ActiveSeatKey").IsUnique();
        });

        modelBuilder.Entity<TicketChangeRequest>(e =>
        {
            e.ToTable("ticket_change_requests");
            e.HasOne(r => r.Ticket).WithMany(t => t.ChangeRequests).HasForeignKey(r => r.TicketId);
            e.HasOne(r => r.NewTrip).WithMany().HasForeignKey(r => r.NewTripId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(r => r.Processor).WithMany().HasForeignKey(r => r.ProcessedBy).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TicketScan>(e =>
        {
            e.ToTable("ticket_scans");
            e.HasOne(s => s.Ticket).WithMany(t => t.Scans).HasForeignKey(s => s.TicketId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(s => s.MonthlyPass).WithMany(m => m.Scans).HasForeignKey(s => s.MonthlyPassId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(s => s.Trip).WithMany().HasForeignKey(s => s.TripId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(s => s.Scanner).WithMany().HasForeignKey(s => s.ScannedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Voucher>(e =>
        {
            e.ToTable("vouchers");
            e.HasIndex(v => v.Code).IsUnique();
            e.Property(v => v.DiscountValue).HasPrecision(10, 2);
        });

        // --- Payments ---
        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.Property(p => p.Amount).HasPrecision(12, 2);
            e.HasIndex(p => p.ProviderTxnId).IsUnique();
            e.HasOne(p => p.Booking).WithMany(b => b.Payments)
                .HasForeignKey(p => p.BookingId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.MonthlyPass).WithMany(m => m.Payments)
                .HasForeignKey(p => p.MonthlyPassId).OnDelete(DeleteBehavior.Restrict);
            e.ToTable(t => t.HasCheckConstraint(
                "CK_payments_target",
                "(`BookingId` IS NOT NULL AND `MonthlyPassId` IS NULL) OR (`BookingId` IS NULL AND `MonthlyPassId` IS NOT NULL)"));
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.ToTable("invoices");
            e.HasIndex(i => i.PaymentId).IsUnique();
            e.HasIndex(i => i.InvoiceNo).IsUnique();
            e.Property(i => i.Total).HasPrecision(12, 2);
            e.HasOne(i => i.Payment).WithOne(p => p.Invoice)
                .HasForeignKey<Invoice>(i => i.PaymentId);
        });

        modelBuilder.Entity<Refund>(e =>
        {
            e.ToTable("refunds");
            e.Property(r => r.Amount).HasPrecision(12, 2);
            e.HasOne(r => r.Payment).WithMany(p => p.Refunds).HasForeignKey(r => r.PaymentId);
            e.HasOne(r => r.ChangeRequest).WithMany(c => c.Refunds)
                .HasForeignKey(r => r.ChangeRequestId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MonthlyPass>(e =>
        {
            e.ToTable("monthly_passes");
            e.HasIndex(m => m.QrCode).IsUnique();
            e.HasOne(m => m.Passenger).WithMany(a => a.MonthlyPasses)
                .HasForeignKey(m => m.PassengerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.BusRoute).WithMany().HasForeignKey(m => m.RouteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(m => m.PassengerType).WithMany(p => p.MonthlyPasses).HasForeignKey(m => m.PassengerTypeId);
            e.HasOne(m => m.PreviousPass).WithMany()
                .HasForeignKey(m => m.PreviousPassId).OnDelete(DeleteBehavior.SetNull);
        });

        // --- Operations ---
        modelBuilder.Entity<BusLocation>(e =>
        {
            e.ToTable("bus_locations");
            e.Property(b => b.Latitude).HasPrecision(10, 6);
            e.Property(b => b.Longitude).HasPrecision(10, 6);
            e.HasOne(b => b.Trip).WithMany(t => t.Locations).HasForeignKey(b => b.TripId);
            e.HasOne(b => b.Bus).WithMany(b => b.Locations).HasForeignKey(b => b.BusId);
        });

        modelBuilder.Entity<Incident>(e =>
        {
            e.ToTable("incidents");
            e.HasOne(i => i.Trip).WithMany(t => t.Incidents).HasForeignKey(i => i.TripId);
            e.HasOne(i => i.Reporter).WithMany().HasForeignKey(i => i.ReportedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.HasOne(n => n.Account).WithMany().HasForeignKey(n => n.AccountId);
            e.HasOne(n => n.Trip).WithMany().HasForeignKey(n => n.TripId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(n => n.Incident).WithMany(i => i.Notifications)
                .HasForeignKey(n => n.IncidentId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Feedback>(e =>
        {
            e.ToTable("feedbacks");
            e.Property(f => f.Content).HasColumnType("TEXT").IsRequired();
            e.HasOne(f => f.Passenger).WithMany().HasForeignKey(f => f.PassengerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(f => f.BusRoute).WithMany().HasForeignKey(f => f.RouteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(f => f.Trip).WithMany().HasForeignKey(f => f.TripId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(f => f.Processor).WithMany().HasForeignKey(f => f.ProcessedBy).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<FeedbackHistory>(e =>
        {
            e.ToTable("feedback_history");
            e.HasOne(h => h.Feedback).WithMany(f => f.History).HasForeignKey(h => h.FeedbackId);
            e.HasOne(h => h.Changer).WithMany().HasForeignKey(h => h.ChangedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BusAssignment>(e =>
        {
            e.ToTable("bus_assignments");
            e.HasIndex(a => a.AssignmentCode);
            e.HasOne(a => a.Route).WithMany().HasForeignKey(a => a.RouteId).OnDelete(DeleteBehavior.Restrict);
        });

        // Store all enums as strings for readability in MySQL.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                var clrType = Nullable.GetUnderlyingType(property.ClrType) ?? property.ClrType;
                if (clrType.IsEnum)
                {
                    var converterType = typeof(EnumToStringConverter<>).MakeGenericType(clrType);
                    var converter = (ValueConverter)Activator.CreateInstance(converterType, (ConverterMappingHints?)null)!;
                    property.SetValueConverter(converter);
                }
            }
        }
    }
}
