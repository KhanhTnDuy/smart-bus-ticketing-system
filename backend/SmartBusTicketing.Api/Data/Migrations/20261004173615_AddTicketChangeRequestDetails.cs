using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTicketChangeRequestDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "ticket_change_requests",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<long>(
                name: "NewSeatId",
                table: "ticket_change_requests",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "ticket_change_requests",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Reason",
                table: "ticket_change_requests",
                type: "varchar(255)",
                maxLength: 255,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            // Hàng cũ (nếu có) nhận mốc thời gian hiện tại thay vì 0001-01-01, giống cách
            // migration AddFeedbackCreatedAt đã làm cho bảng feedbacks.
            migrationBuilder.Sql(
                "UPDATE `ticket_change_requests` SET `CreatedAt` = UTC_TIMESTAMP(6) WHERE `CreatedAt` = '0001-01-01 00:00:00';");

            migrationBuilder.CreateIndex(
                name: "IX_ticket_change_requests_NewSeatId",
                table: "ticket_change_requests",
                column: "NewSeatId");

            migrationBuilder.AddForeignKey(
                name: "FK_ticket_change_requests_seats_NewSeatId",
                table: "ticket_change_requests",
                column: "NewSeatId",
                principalTable: "seats",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ticket_change_requests_seats_NewSeatId",
                table: "ticket_change_requests");

            migrationBuilder.DropIndex(
                name: "IX_ticket_change_requests_NewSeatId",
                table: "ticket_change_requests");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "ticket_change_requests");

            migrationBuilder.DropColumn(
                name: "NewSeatId",
                table: "ticket_change_requests");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "ticket_change_requests");

            migrationBuilder.DropColumn(
                name: "Reason",
                table: "ticket_change_requests");
        }
    }
}
