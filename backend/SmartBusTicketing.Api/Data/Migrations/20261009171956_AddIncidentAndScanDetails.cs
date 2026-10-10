using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentAndScanDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ScannedAt",
                table: "ticket_scans",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "notifications",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Message",
                table: "notifications",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "incidents",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "incidents",
                type: "TEXT",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "incidents",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "ResolutionNote",
                table: "incidents",
                type: "TEXT",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ResolvedAt",
                table: "incidents",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ResolvedBy",
                table: "incidents",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_incidents_ResolvedBy",
                table: "incidents",
                column: "ResolvedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_incidents_accounts_ResolvedBy",
                table: "incidents",
                column: "ResolvedBy",
                principalTable: "accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_incidents_accounts_ResolvedBy",
                table: "incidents");

            migrationBuilder.DropIndex(
                name: "IX_incidents_ResolvedBy",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "ScannedAt",
                table: "ticket_scans");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "Message",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "ResolutionNote",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "ResolvedAt",
                table: "incidents");

            migrationBuilder.DropColumn(
                name: "ResolvedBy",
                table: "incidents");
        }
    }
}
