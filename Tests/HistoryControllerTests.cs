using Microsoft.AspNetCore.Mvc;
using BookMaster.Api.Controllers;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Models;
using Xunit;

namespace BookMaster.Tests;

public class HistoryControllerTests
{
    private static async Task<(AppDbContext db, User owner, User requester, User stranger, long historyId)> Seed()
    {
        var db = TestDbFactory.Create();
        var owner = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var requester = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        var stranger = new User { Name = "Carol", Email = "carol@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.AddRange(owner, requester, stranger);
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var listedBook = new Book { Title = "Clean Code", OwnerId = owner.Id, CategoryId = category.Id, Status = BookStatus.Exchanged };
        var offeredBook = new Book { Title = "Effective Java", OwnerId = requester.Id, CategoryId = category.Id, Status = BookStatus.Exchanged };
        db.Books.AddRange(listedBook, offeredBook);
        await db.SaveChangesAsync();

        var listing = new ExchangeListing { BookId = listedBook.Id, WantedType = "Effective Java" };
        db.ExchangeListings.Add(listing);
        await db.SaveChangesAsync();

        var request = new ExchangeRequest { ListingId = listing.Id, RequesterId = requester.Id, OfferedBookId = offeredBook.Id, Status = ExchangeRequestStatus.Accepted };
        db.ExchangeRequests.Add(request);
        await db.SaveChangesAsync();

        var history = new History { RequestId = request.Id, CompletedAt = DateTime.UtcNow };
        db.History.Add(history);
        await db.SaveChangesAsync();

        return (db, owner, requester, stranger, history.Id);
    }

    [Fact]
    public async Task GetAll_ReturnsUnauthorized_WhenAnonymous()
    {
        var (db, _, _, _, _) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.GetAll();

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_ReturnsOnlyOwnHistory_ForRequester()
    {
        var (db, _, requester, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Contains(history, h => h.Id == historyId);
    }

    [Fact]
    public async Task GetAll_ReturnsOnlyOwnHistory_ForListedBookOwner()
    {
        var (db, owner, _, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Contains(history, h => h.Id == historyId);
    }

    [Fact]
    public async Task GetAll_ReturnsEmpty_ForUnrelatedUser()
    {
        var (db, _, _, stranger, _) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, stranger.Id, stranger.Role, stranger.Name);

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Empty(history);
    }

    [Fact]
    public async Task GetAll_ReturnsAll_ForAdmin()
    {
        var (db, _, _, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Contains(history, h => h.Id == historyId);
    }

    [Fact]
    public async Task GetById_ReturnsUnauthorized_WhenAnonymous()
    {
        var (db, _, _, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.GetById(historyId);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsOk_ForRequester()
    {
        var (db, _, requester, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);

        var result = await controller.GetById(historyId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<HistoryDto>(ok.Value);
        Assert.Equal(historyId, dto.Id);
    }

    [Fact]
    public async Task GetById_ReturnsForbidden_ForUnrelatedUser()
    {
        var (db, _, _, stranger, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, stranger.Id, stranger.Role, stranger.Name);

        var result = await controller.GetById(historyId);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsOk_ForAdmin()
    {
        var (db, _, _, _, historyId) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.GetById(historyId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<HistoryDto>(ok.Value);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        var (db, _, requester, _, _) = await Seed();
        var controller = new HistoryController(db);
        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);

        var result = await controller.GetById(99999);

        Assert.IsType<NotFoundResult>(result.Result);
    }
}