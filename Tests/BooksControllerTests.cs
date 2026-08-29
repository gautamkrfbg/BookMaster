using Microsoft.AspNetCore.Mvc;
using BookMaster.Api.Controllers;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Models;
using Xunit;

namespace BookMaster.Tests;

public class BooksControllerTests
{
    private static async Task<(AppDbContext db, User user, Category category)> Seed()
    {
        var db = TestDbFactory.Create();
        var user = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.Add(user);
        db.Categories.Add(category);
        await db.SaveChangesAsync();
        return (db, user, category);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenCategoryMissing()
    {
        var (db, user, _) = await Seed();
        var controller = new BooksController(db);
        TestAuth.SetUser(controller, user.Id, user.Role, user.Name);

        var result = await controller.Create(new CreateBookDto("Clean Code", 999));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_SetsCurrentUserAsOwner()
    {
        var (db, user, category) = await Seed();
        var controller = new BooksController(db);
        TestAuth.SetUser(controller, user.Id, user.Role, user.Name);

        var result = await controller.Create(new CreateBookDto("Clean Code", category.Id));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<BookDto>(created.Value);
        Assert.Equal(user.Id, dto.OwnerId);
        Assert.Equal(BookStatus.Owned, dto.Status);
    }

    [Fact]
    public async Task GetAll_FiltersBySearchTerm()
    {
        var (db, user, category) = await Seed();
        db.Books.Add(new Book { Title = "Clean Code", OwnerId = user.Id, CategoryId = category.Id, Status = BookStatus.Owned });
        db.Books.Add(new Book { Title = "Effective Java", OwnerId = user.Id, CategoryId = category.Id, Status = BookStatus.Owned });
        await db.SaveChangesAsync();

        var controller = new BooksController(db);
        var result = await controller.GetAll(search: "Clean", categoryId: null);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var books = Assert.IsAssignableFrom<IEnumerable<BookDto>>(ok.Value);
        Assert.Single(books);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenTitleIsWhitespace()
    {
        var (db, user, category) = await Seed();
        var controller = new BooksController(db);
        TestAuth.SetUser(controller, user.Id, user.Role, user.Name);

        var result = await controller.Create(new CreateBookDto("   ", category.Id));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsUnauthorized_WhenTokenSubjectUserNoLongerExists()
    {
        var (db, _, category) = await Seed();
        var controller = new BooksController(db);
        TestAuth.SetUser(controller, 99999, "USER", "Ghost");

        var result = await controller.Create(new CreateBookDto("Clean Code", category.Id));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }
}