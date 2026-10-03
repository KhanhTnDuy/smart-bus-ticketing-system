using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBusTicketing.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFeedbackCreatedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "feedbacks",
                type: "datetime(6)",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Phản ánh tạo trước migration này không có mốc thời gian nào để khôi phục,
            // nếu để nguyên mặc định sẽ hiển thị năm 0001 trên trang quản lý. Gán tạm
            // thời điểm chạy migration để danh sách vẫn sắp xếp được.
            migrationBuilder.Sql(
                "UPDATE `feedbacks` SET `CreatedAt` = UTC_TIMESTAMP(6) WHERE `CreatedAt` = '0001-01-01 00:00:00';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "feedbacks");
        }
    }
}
