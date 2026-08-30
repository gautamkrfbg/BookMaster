using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookMaster.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBookPriceAndCatalogue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_catalogue",
                table: "books",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "price",
                table: "books",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_catalogue",
                table: "books");

            migrationBuilder.DropColumn(
                name: "price",
                table: "books");
        }
    }
}
