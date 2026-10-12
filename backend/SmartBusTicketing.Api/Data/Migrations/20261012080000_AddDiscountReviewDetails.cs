using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartBusTicketing.Api.Data;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261012080000_AddDiscountReviewDetails")]
public partial class AddDiscountReviewDetails : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "RejectReason",
            table: "passenger_verifications",
            type: "varchar(1000)",
            maxLength: 1000,
            nullable: true)
            .Annotation("MySql:CharSet", "utf8mb4");

        migrationBuilder.AddColumn<DateTime>(
            name: "ReviewedAt",
            table: "passenger_verifications",
            type: "datetime(6)",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "RejectReason", table: "passenger_verifications");
        migrationBuilder.DropColumn(name: "ReviewedAt", table: "passenger_verifications");
    }
}
