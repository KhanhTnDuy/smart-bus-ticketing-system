using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class FixTripBusDepartureUniqueness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_trips_BusId_DepartureAt",
                table: "trips");

            // MySQL has no filtered unique indexes. A stored generated column
            // returns NULL for cancelled trips, so only active trips reserve
            // the bus/departure slot.
            migrationBuilder.AddColumn<string>(
                name: "ActiveBusDepartureKey",
                table: "trips",
                type: "varchar(255)",
                nullable: true,
                computedColumnSql: "(CASE WHEN `BusId` IS NOT NULL AND `Status` <> 'Cancelled' THEN CONCAT(`BusId`, '-', DATE_FORMAT(`DepartureAt`, '%Y-%m-%d %H:%i:%s.%f')) END)",
                stored: true);

            migrationBuilder.CreateIndex(
                name: "IX_trips_ActiveBusDepartureKey",
                table: "trips",
                column: "ActiveBusDepartureKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_trips_ActiveBusDepartureKey",
                table: "trips");

            migrationBuilder.DropColumn(
                name: "ActiveBusDepartureKey",
                table: "trips");

            migrationBuilder.CreateIndex(
                name: "IX_trips_BusId_DepartureAt",
                table: "trips",
                columns: new[] { "BusId", "DepartureAt" },
                unique: true);
        }
    }
}
