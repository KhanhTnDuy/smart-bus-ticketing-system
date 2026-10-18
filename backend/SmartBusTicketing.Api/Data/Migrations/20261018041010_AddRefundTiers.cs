using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundTiers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "refund_tiers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    hours_before = table.Column<int>(type: "int", nullable: false),
                    percent = table.Column<int>(type: "int", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refund_tiers", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "refund_tiers",
                columns: new[] { "hours_before", "percent", "updated_at" },
                values: new object[] { 24, 100, DateTime.UtcNow });

            migrationBuilder.InsertData(
                table: "refund_tiers",
                columns: new[] { "hours_before", "percent", "updated_at" },
                values: new object[] { 2, 50, DateTime.UtcNow });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "refund_tiers");
        }
    }
}
