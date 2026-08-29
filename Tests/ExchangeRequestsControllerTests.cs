using Microsoft.AspNetCore.Mvc;
using BookMaster.Api.Controllers;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Models;
using Xunit;

namespace BookMaster.Tests;

public class ExchangeRequestsControllerTests
{
    private static async Task<(AppDbContext db, User owner, User requester, Category category, Book listedBook, Book offeredBook, ExchangeListing listing)> Seed()
    {
        var db = TestDbFactory.Create();
        var owner = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var requester = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.AddRange(owner, requester);
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var listedBook = new Book { Title = "Clean Code", OwnerId = owner.Id, CategoryId = category.Id, Status = BookStatus.Listed };
        var offeredBook = new Book { Title = "Effective Java", OwnerId = requester.Id, CategoryId = category.Id, Status = BookStatus.Owned };
        db.Books.AddRange(listedBook, offeredBook);
        await db.SaveChangesAsync();

        var listing = new ExchangeListing { BookId = listedBook.Id, WantedType = "Effective Java" };
        db.ExchangeListings.Add(listing);
        await db.SaveChangesAsync();

        return (db, owner, requester, category, listedBook, offeredBook, listing);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenRequesterDoesNotOwnOfferedBook()
    {
        var (db, owner, _, _, _, offeredBook, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Accept_TransfersOwnership_AndRecordsHistory()
    {
        var (db, owner, requester, _, listedBook, offeredBook, listing) = await Seed();
        var requestsController = new ExchangeRequestsController(db);

        TestAuth.SetUser(requestsController, requester.Id, requester.Role, requester.Name);
        var createResult = await requestsController.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var requestDto = Assert.IsType<ExchangeRequestDto>(created.Value);

        TestAuth.SetUser(requestsController, owner.Id, owner.Role, owner.Name);
        var acceptResult = await requestsController.Accept(requestDto.Id);
        Assert.IsType<NoContentResult>(acceptResult);

        var refreshedListedBook = await db.Books.FindAsync(listedBook.Id);
        var refreshedOfferedBook = await db.Books.FindAsync(offeredBook.Id);

        Assert.Equal(requester.Id, refreshedListedBook!.OwnerId);
        Assert.Equal(owner.Id, refreshedOfferedBook!.OwnerId);
        Assert.Equal(BookStatus.Exchanged, refreshedListedBook.Status);
        Assert.Equal(BookStatus.Exchanged, refreshedOfferedBook.Status);

        Assert.Single(db.History);
        Assert.Single(db.ExchangeListings);
    }

    [Fact]
    public async Task Accept_ReturnsForbidden_WhenNotListingOwner()
    {
        var (db, _, requester, _, _, offeredBook, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);

        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);
        var createResult = await controller.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var requestDto = Assert.IsType<ExchangeRequestDto>(created.Value);

        var acceptResult = await controller.Accept(requestDto.Id);
        Assert.IsType<ForbidResult>(acceptResult);
    }

    [Fact]
    public async Task Accept_ReturnsConflict_WhenRequestAlreadyProcessed()
    {
        var (db, owner, requester, _, _, offeredBook, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);

        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);
        var createResult = await controller.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var requestDto = Assert.IsType<ExchangeRequestDto>(created.Value);

        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);
        await controller.Accept(requestDto.Id);
        var secondAccept = await controller.Accept(requestDto.Id);

        Assert.IsType<ConflictObjectResult>(secondAccept);
    }

    [Fact]
    public async Task Accept_ReturnsConflict_WhenOfferedBookAlreadyExchanged()
    {
        var (db, owner, requester, _, _, offeredBook, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);

        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);
        var createResult = await controller.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var requestDto = Assert.IsType<ExchangeRequestDto>(created.Value);

        offeredBook.Status = BookStatus.Exchanged;
        await db.SaveChangesAsync();

        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);
        var acceptResult = await controller.Accept(requestDto.Id);

        Assert.IsType<ConflictObjectResult>(acceptResult);
    }

    [Fact]
    public async Task Reject_ReturnsForbidden_WhenNotListingOwner()
    {
        var (db, _, requester, _, _, offeredBook, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);

        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);
        var createResult = await controller.Create(new CreateExchangeRequestDto(listing.Id, offeredBook.Id));
        var created = Assert.IsType<CreatedAtActionResult>(createResult.Result);
        var requestDto = Assert.IsType<ExchangeRequestDto>(created.Value);

        var rejectResult = await controller.Reject(requestDto.Id);

        Assert.IsType<ForbidResult>(rejectResult);
    }

    [Fact]
    public async Task Create_ReturnsUnauthorized_WhenTokenSubjectUserNoLongerExists()
    {
        var (db, _, _, _, _, _, listing) = await Seed();
        var controller = new ExchangeRequestsController(db);
        TestAuth.SetUser(controller, 99999, "USER", "Ghost");

        var result = await controller.Create(new CreateExchangeRequestDto(listing.Id, 1));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }
}