using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "accounts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Username = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PasswordHash = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    FullName = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "varchar(255)", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Phone = table.Column<string>(type: "varchar(255)", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Role = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accounts", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "buses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PlateNumber = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buses", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "passenger_types",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_passenger_types", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "routes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartPoint = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    EndPoint = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DistanceKm = table.Column<decimal>(type: "decimal(8,2)", precision: 8, scale: 2, nullable: false),
                    Active = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_routes", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "stops",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Name = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Latitude = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false),
                    Longitude = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stops", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "vouchers",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Code = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DiscountType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DiscountValue = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    StartAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    EndAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UsageLimit = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vouchers", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<long>(type: "bigint", nullable: true),
                    Username = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Action = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ActionType = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    TargetResource = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IpAddress = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    UserAgent = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Details = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_audit_logs_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "seats",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BusId = table.Column<long>(type: "bigint", nullable: false),
                    SeatCode = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SeatRow = table.Column<int>(type: "int", nullable: false),
                    SeatCol = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_seats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_seats_buses_BusId",
                        column: x => x.BusId,
                        principalTable: "buses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "passenger_verifications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<long>(type: "bigint", nullable: false),
                    PassengerTypeId = table.Column<int>(type: "int", nullable: false),
                    DocumentUrl = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ReviewedBy = table.Column<long>(type: "bigint", nullable: true),
                    ValidUntil = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_passenger_verifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_passenger_verifications_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_passenger_verifications_accounts_ReviewedBy",
                        column: x => x.ReviewedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_passenger_verifications_passenger_types_PassengerTypeId",
                        column: x => x.PassengerTypeId,
                        principalTable: "passenger_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "fares",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    TicketType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PassengerTypeId = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_fares", x => x.Id);
                    table.ForeignKey(
                        name: "FK_fares_passenger_types_PassengerTypeId",
                        column: x => x.PassengerTypeId,
                        principalTable: "passenger_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_fares_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "monthly_passes",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PassengerId = table.Column<long>(type: "bigint", nullable: false),
                    RouteId = table.Column<long>(type: "bigint", nullable: true),
                    PassengerTypeId = table.Column<int>(type: "int", nullable: false),
                    PreviousPassId = table.Column<long>(type: "bigint", nullable: true),
                    ValidFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    ValidTo = table.Column<DateOnly>(type: "date", nullable: false),
                    QrCode = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_monthly_passes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_monthly_passes_accounts_PassengerId",
                        column: x => x.PassengerId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_monthly_passes_monthly_passes_PreviousPassId",
                        column: x => x.PreviousPassId,
                        principalTable: "monthly_passes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_monthly_passes_passenger_types_PassengerTypeId",
                        column: x => x.PassengerTypeId,
                        principalTable: "passenger_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_monthly_passes_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "schedules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    FirstDeparture = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    LastDeparture = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    FrequencyMinutes = table.Column<int>(type: "int", nullable: false),
                    DaysOfWeek = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_schedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_schedules_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "route_stops",
                columns: table => new
                {
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    StopId = table.Column<long>(type: "bigint", nullable: false),
                    StopOrder = table.Column<int>(type: "int", nullable: false),
                    MinutesFromStart = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_route_stops", x => new { x.RouteId, x.StopId });
                    table.ForeignKey(
                        name: "FK_route_stops_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_route_stops_stops_StopId",
                        column: x => x.StopId,
                        principalTable: "stops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "trips",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    RouteId = table.Column<long>(type: "bigint", nullable: false),
                    ScheduleId = table.Column<long>(type: "bigint", nullable: true),
                    BusId = table.Column<long>(type: "bigint", nullable: true),
                    DepartureAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DelayMinutes = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trips", x => x.Id);
                    table.ForeignKey(
                        name: "FK_trips_buses_BusId",
                        column: x => x.BusId,
                        principalTable: "buses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_trips_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trips_schedules_ScheduleId",
                        column: x => x.ScheduleId,
                        principalTable: "schedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "bookings",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BookingCode = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PassengerId = table.Column<long>(type: "bigint", nullable: false),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    VoucherId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    HoldExpiresAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    FinalAmount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bookings_accounts_PassengerId",
                        column: x => x.PassengerId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_bookings_vouchers_VoucherId",
                        column: x => x.VoucherId,
                        principalTable: "vouchers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "bus_locations",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    BusId = table.Column<long>(type: "bigint", nullable: false),
                    Latitude = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false),
                    Longitude = table.Column<decimal>(type: "decimal(10,6)", precision: 10, scale: 6, nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bus_locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_bus_locations_buses_BusId",
                        column: x => x.BusId,
                        principalTable: "buses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_bus_locations_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "feedbacks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PassengerId = table.Column<long>(type: "bigint", nullable: false),
                    RouteId = table.Column<long>(type: "bigint", nullable: true),
                    TripId = table.Column<long>(type: "bigint", nullable: true),
                    Type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Subject = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Rating = table.Column<byte>(type: "tinyint unsigned", nullable: false),
                    ImagePath = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ProcessedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedbacks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_feedbacks_accounts_PassengerId",
                        column: x => x.PassengerId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_feedbacks_accounts_ProcessedBy",
                        column: x => x.ProcessedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_feedbacks_routes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "routes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_feedbacks_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "incidents",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    ReportedBy = table.Column<long>(type: "bigint", nullable: false),
                    IncidentType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DelayMinutes = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_incidents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_incidents_accounts_ReportedBy",
                        column: x => x.ReportedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_incidents_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "trip_staff",
                columns: table => new
                {
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    AccountId = table.Column<long>(type: "bigint", nullable: false),
                    Duty = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trip_staff", x => new { x.TripId, x.AccountId });
                    table.ForeignKey(
                        name: "FK_trip_staff_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_trip_staff_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "payments",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BookingId = table.Column<long>(type: "bigint", nullable: true),
                    MonthlyPassId = table.Column<long>(type: "bigint", nullable: true),
                    Method = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ProviderTxnId = table.Column<string>(type: "varchar(255)", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaidAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.CheckConstraint("CK_payments_target", "(booking_id IS NOT NULL AND monthly_pass_id IS NULL) OR (booking_id IS NULL AND monthly_pass_id IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_payments_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_payments_monthly_passes_MonthlyPassId",
                        column: x => x.MonthlyPassId,
                        principalTable: "monthly_passes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "tickets",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    BookingId = table.Column<long>(type: "bigint", nullable: false),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    SeatId = table.Column<long>(type: "bigint", nullable: false),
                    BoardStopId = table.Column<long>(type: "bigint", nullable: false),
                    AlightStopId = table.Column<long>(type: "bigint", nullable: false),
                    QrCode = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ActiveSeatKey = table.Column<string>(type: "varchar(255)", nullable: true, computedColumnSql: "(CASE WHEN `status` IN ('Held','Valid','Used') THEN CONCAT(`trip_id`, '-', `seat_id`) END)", stored: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tickets_bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_tickets_seats_SeatId",
                        column: x => x.SeatId,
                        principalTable: "seats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tickets_stops_AlightStopId",
                        column: x => x.AlightStopId,
                        principalTable: "stops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tickets_stops_BoardStopId",
                        column: x => x.BoardStopId,
                        principalTable: "stops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tickets_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "feedback_history",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    FeedbackId = table.Column<long>(type: "bigint", nullable: false),
                    OldStatus = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NewStatus = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ChangedBy = table.Column<long>(type: "bigint", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedback_history", x => x.Id);
                    table.ForeignKey(
                        name: "FK_feedback_history_accounts_ChangedBy",
                        column: x => x.ChangedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_feedback_history_feedbacks_FeedbackId",
                        column: x => x.FeedbackId,
                        principalTable: "feedbacks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    AccountId = table.Column<long>(type: "bigint", nullable: false),
                    TripId = table.Column<long>(type: "bigint", nullable: true),
                    IncidentId = table.Column<long>(type: "bigint", nullable: true),
                    Type = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsRead = table.Column<bool>(type: "tinyint(1)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_notifications_accounts_AccountId",
                        column: x => x.AccountId,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notifications_incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalTable: "incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_notifications_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "invoices",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PaymentId = table.Column<long>(type: "bigint", nullable: false),
                    InvoiceNo = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Email = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Total = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_invoices_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_change_requests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TicketId = table.Column<long>(type: "bigint", nullable: false),
                    RequestType = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NewTripId = table.Column<long>(type: "bigint", nullable: true),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ProcessedBy = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_change_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ticket_change_requests_accounts_ProcessedBy",
                        column: x => x.ProcessedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ticket_change_requests_tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ticket_change_requests_trips_NewTripId",
                        column: x => x.NewTripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "ticket_scans",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TicketId = table.Column<long>(type: "bigint", nullable: true),
                    MonthlyPassId = table.Column<long>(type: "bigint", nullable: true),
                    TripId = table.Column<long>(type: "bigint", nullable: false),
                    ScannedBy = table.Column<long>(type: "bigint", nullable: false),
                    Result = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_scans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ticket_scans_accounts_ScannedBy",
                        column: x => x.ScannedBy,
                        principalTable: "accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ticket_scans_monthly_passes_MonthlyPassId",
                        column: x => x.MonthlyPassId,
                        principalTable: "monthly_passes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ticket_scans_tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ticket_scans_trips_TripId",
                        column: x => x.TripId,
                        principalTable: "trips",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "refunds",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    PaymentId = table.Column<long>(type: "bigint", nullable: false),
                    ChangeRequestId = table.Column<long>(type: "bigint", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(12,2)", precision: 12, scale: 2, nullable: false),
                    Reason = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refunds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_refunds_payments_PaymentId",
                        column: x => x.PaymentId,
                        principalTable: "payments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_refunds_ticket_change_requests_ChangeRequestId",
                        column: x => x.ChangeRequestId,
                        principalTable: "ticket_change_requests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_accounts_Email",
                table: "accounts",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_Phone",
                table: "accounts",
                column: "Phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_accounts_Username",
                table: "accounts",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_AccountId",
                table: "audit_logs",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_Username_ActionType_CreatedAt",
                table: "audit_logs",
                columns: new[] { "Username", "ActionType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_bookings_BookingCode",
                table: "bookings",
                column: "BookingCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bookings_PassengerId",
                table: "bookings",
                column: "PassengerId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_TripId",
                table: "bookings",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_bookings_VoucherId",
                table: "bookings",
                column: "VoucherId");

            migrationBuilder.CreateIndex(
                name: "IX_bus_locations_BusId",
                table: "bus_locations",
                column: "BusId");

            migrationBuilder.CreateIndex(
                name: "IX_bus_locations_TripId",
                table: "bus_locations",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_buses_PlateNumber",
                table: "buses",
                column: "PlateNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_fares_PassengerTypeId",
                table: "fares",
                column: "PassengerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_fares_RouteId",
                table: "fares",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_history_ChangedBy",
                table: "feedback_history",
                column: "ChangedBy");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_history_FeedbackId",
                table: "feedback_history",
                column: "FeedbackId");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_PassengerId",
                table: "feedbacks",
                column: "PassengerId");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_ProcessedBy",
                table: "feedbacks",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_RouteId",
                table: "feedbacks",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_feedbacks_TripId",
                table: "feedbacks",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_incidents_ReportedBy",
                table: "incidents",
                column: "ReportedBy");

            migrationBuilder.CreateIndex(
                name: "IX_incidents_TripId",
                table: "incidents",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_invoices_InvoiceNo",
                table: "invoices",
                column: "InvoiceNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_invoices_PaymentId",
                table: "invoices",
                column: "PaymentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_monthly_passes_PassengerId",
                table: "monthly_passes",
                column: "PassengerId");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_passes_PassengerTypeId",
                table: "monthly_passes",
                column: "PassengerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_passes_PreviousPassId",
                table: "monthly_passes",
                column: "PreviousPassId");

            migrationBuilder.CreateIndex(
                name: "IX_monthly_passes_QrCode",
                table: "monthly_passes",
                column: "QrCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_monthly_passes_RouteId",
                table: "monthly_passes",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_AccountId",
                table: "notifications",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_IncidentId",
                table: "notifications",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_notifications_TripId",
                table: "notifications",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_passenger_types_Code",
                table: "passenger_types",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_passenger_verifications_AccountId",
                table: "passenger_verifications",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_passenger_verifications_PassengerTypeId",
                table: "passenger_verifications",
                column: "PassengerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_passenger_verifications_ReviewedBy",
                table: "passenger_verifications",
                column: "ReviewedBy");

            migrationBuilder.CreateIndex(
                name: "IX_payments_BookingId",
                table: "payments",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_MonthlyPassId",
                table: "payments",
                column: "MonthlyPassId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_ProviderTxnId",
                table: "payments",
                column: "ProviderTxnId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_refunds_ChangeRequestId",
                table: "refunds",
                column: "ChangeRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_refunds_PaymentId",
                table: "refunds",
                column: "PaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_route_stops_RouteId_StopOrder",
                table: "route_stops",
                columns: new[] { "RouteId", "StopOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_route_stops_StopId",
                table: "route_stops",
                column: "StopId");

            migrationBuilder.CreateIndex(
                name: "IX_routes_Code",
                table: "routes",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_schedules_RouteId",
                table: "schedules",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_seats_BusId_SeatCode",
                table: "seats",
                columns: new[] { "BusId", "SeatCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ticket_change_requests_NewTripId",
                table: "ticket_change_requests",
                column: "NewTripId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_change_requests_ProcessedBy",
                table: "ticket_change_requests",
                column: "ProcessedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_change_requests_TicketId",
                table: "ticket_change_requests",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_scans_MonthlyPassId",
                table: "ticket_scans",
                column: "MonthlyPassId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_scans_ScannedBy",
                table: "ticket_scans",
                column: "ScannedBy");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_scans_TicketId",
                table: "ticket_scans",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_scans_TripId",
                table: "ticket_scans",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_ActiveSeatKey",
                table: "tickets",
                column: "ActiveSeatKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tickets_AlightStopId",
                table: "tickets",
                column: "AlightStopId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_BoardStopId",
                table: "tickets",
                column: "BoardStopId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_BookingId",
                table: "tickets",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_QrCode",
                table: "tickets",
                column: "QrCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tickets_SeatId",
                table: "tickets",
                column: "SeatId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_TripId",
                table: "tickets",
                column: "TripId");

            migrationBuilder.CreateIndex(
                name: "IX_trip_staff_AccountId",
                table: "trip_staff",
                column: "AccountId");

            migrationBuilder.CreateIndex(
                name: "IX_trips_BusId_DepartureAt",
                table: "trips",
                columns: new[] { "BusId", "DepartureAt" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_trips_RouteId",
                table: "trips",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_trips_ScheduleId",
                table: "trips",
                column: "ScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_vouchers_Code",
                table: "vouchers",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "bus_locations");

            migrationBuilder.DropTable(
                name: "fares");

            migrationBuilder.DropTable(
                name: "feedback_history");

            migrationBuilder.DropTable(
                name: "invoices");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "passenger_verifications");

            migrationBuilder.DropTable(
                name: "refunds");

            migrationBuilder.DropTable(
                name: "route_stops");

            migrationBuilder.DropTable(
                name: "ticket_scans");

            migrationBuilder.DropTable(
                name: "trip_staff");

            migrationBuilder.DropTable(
                name: "feedbacks");

            migrationBuilder.DropTable(
                name: "incidents");

            migrationBuilder.DropTable(
                name: "payments");

            migrationBuilder.DropTable(
                name: "ticket_change_requests");

            migrationBuilder.DropTable(
                name: "monthly_passes");

            migrationBuilder.DropTable(
                name: "tickets");

            migrationBuilder.DropTable(
                name: "passenger_types");

            migrationBuilder.DropTable(
                name: "bookings");

            migrationBuilder.DropTable(
                name: "seats");

            migrationBuilder.DropTable(
                name: "stops");

            migrationBuilder.DropTable(
                name: "accounts");

            migrationBuilder.DropTable(
                name: "trips");

            migrationBuilder.DropTable(
                name: "vouchers");

            migrationBuilder.DropTable(
                name: "buses");

            migrationBuilder.DropTable(
                name: "schedules");

            migrationBuilder.DropTable(
                name: "routes");
        }
    }
}
