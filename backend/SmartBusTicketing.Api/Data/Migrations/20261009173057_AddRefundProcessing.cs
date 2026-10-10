using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundProcessing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "refunds",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Note",
                table: "refunds",
                type: "TEXT",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "refunds",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ProcessedBy",
                table: "refunds",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_refunds_ProcessedBy",
                table: "refunds",
                column: "ProcessedBy");

            migrationBuilder.AddForeignKey(
                name: "FK_refunds_accounts_ProcessedBy",
                table: "refunds",
                column: "ProcessedBy",
                principalTable: "accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_refunds_accounts_ProcessedBy",
                table: "refunds");

            migrationBuilder.DropIndex(
                name: "IX_refunds_ProcessedBy",
                table: "refunds");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "refunds");

            migrationBuilder.DropColumn(
                name: "Note",
                table: "refunds");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "refunds");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "refunds");
        }
    }
}
