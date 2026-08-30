using Microsoft.AspNetCore.Mvc;
using BookMaster.Api.Controllers;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Models;
using BookMaster.Api.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BookMaster.Tests;

public class UsersControllerTests
{
    private static AuthController CreateAuthController(AppDbContext db)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "test-signing-key-that-is-long-enough-for-hmac-sha256",
                ["Jwt:Issuer"] = "BookMaster.Api",
                ["Jwt:Audience"] = "BookMaster.Mvc",
                ["Jwt:ExpiryMinutes"] = "60"
            })
            .Build();

        return new AuthController(db, new TokenService(config));
    }

    [Fact]
    public async Task Register_ReturnsToken_WhenEmailIsUnique()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Register(new RegisterDto("Alice", "Alice@Example.com", "password123"));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<AuthResponseDto>(created.Value);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
        Assert.Equal("USER", response.User.Role);
        Assert.Equal("alice@example.com", response.User.Email);
    }

    [Fact]
    public async Task Register_ReturnsConflict_WhenEmailAlreadyExists()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        await controller.Register(new RegisterDto("Alice", "alice@example.com", "password123"));
        var result = await controller.Register(new RegisterDto("Bob", "alice@example.com", "password456"));

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsToken_WhenCredentialsValid()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        await controller.Register(new RegisterDto("Alice", "alice@example.com", "password123"));
        var result = await controller.Login(new LoginDto("alice@example.com", "password123"));

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<AuthResponseDto>(ok.Value);
        Assert.False(string.IsNullOrWhiteSpace(response.Token));
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenPasswordInvalid()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        await controller.Register(new RegisterDto("Alice", "alice@example.com", "password123"));
        var result = await controller.Login(new LoginDto("alice@example.com", "wrong-password"));

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenUserMissing()
    {
        var db = TestDbFactory.Create();
        var controller = new UsersController(db);

        var result = await controller.GetById(999);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Register_ReturnsBadRequest_WhenNameIsNull()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Register(new RegisterDto(null!, "alice@example.com", "password123"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_ReturnsBadRequest_WhenEmailIsWhitespace()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Register(new RegisterDto("Alice", "   ", "password123"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_ReturnsBadRequest_WhenPasswordTooShort()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Register(new RegisterDto("Alice", "alice@example.com", "12345"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsBadRequest_WhenEmailIsNull()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Login(new LoginDto(null!, "password123"));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsBadRequest_WhenPasswordIsNull()
    {
        var db = TestDbFactory.Create();
        var controller = CreateAuthController(db);

        var result = await controller.Login(new LoginDto("alice@example.com", null!));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenNewNameIsWhitespace()
    {
        var db = TestDbFactory.Create();
        var user = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, user.Id, user.Role, user.Name);

        var result = await controller.Update(user.Id, new UpdateUserDto("   ", "alice@example.com", null));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenNewEmailIsWhitespace()
    {
        var db = TestDbFactory.Create();
        var user = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, user.Id, user.Role, user.Name);

        var result = await controller.Update(user.Id, new UpdateUserDto("Alice", "   ", null));

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Update_ReturnsForbidden_WhenUpdatingAnotherUser()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var bob = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.AddRange(alice, bob);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, alice.Id, alice.Role, alice.Name);

        var result = await controller.Update(bob.Id, new UpdateUserDto("Bob", "bob@example.com", null));

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task GetNotifications_ReturnsForbidden_ForAnotherUser()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var bob = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.AddRange(alice, bob);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, alice.Id, alice.Role, alice.Name);

        var result = await controller.GetNotifications(bob.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetLibrary_ReturnsUnauthorized_WhenAnonymous()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.Add(alice);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.GetLibrary(alice.Id);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetLibrary_ReturnsForbidden_ForAnotherUser()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var bob = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.AddRange(alice, bob);
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, alice.Id, alice.Role, alice.Name);

        var result = await controller.GetLibrary(bob.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetLibrary_ReturnsOk_ForOwner()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.Add(alice);
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        db.Books.Add(new Book { Title = "Clean Code", OwnerId = alice.Id, CategoryId = category.Id, Status = BookStatus.Owned, IsCatalogue = false });
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, alice.Id, alice.Role, alice.Name);

        var result = await controller.GetLibrary(alice.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var books = Assert.IsType<List<BookDto>>(ok.Value);
        Assert.Single(books);
    }

    [Fact]
    public async Task GetLibrary_ReturnsOk_ForAdmin()
    {
        var db = TestDbFactory.Create();
        var alice = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.Add(alice);
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        db.Books.Add(new Book { Title = "Clean Code", OwnerId = alice.Id, CategoryId = category.Id, Status = BookStatus.Owned, IsCatalogue = false });
        await db.SaveChangesAsync();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.GetLibrary(alice.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var books = Assert.IsType<List<BookDto>>(ok.Value);
        Assert.Single(books);
    }

    private static async Task<(AppDbContext db, User owner, User requester, User stranger)> SeedExchangeHistory()
    {
        var db = TestDbFactory.Create();
        var owner = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var requester = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        var stranger = new User { Name = "Carol", Email = "carol@example.com", PasswordHash = "x", Role = "USER" };
        var category = new Category { Name = "Programming" };
        db.Users.AddRange(owner, requester, stranger);
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        var listedBook = new Book { Title = "Clean Code", OwnerId = owner.Id, CategoryId = category.Id, Status = BookStatus.Listed };
        var offeredBook = new Book { Title = "Effective Java", OwnerId = requester.Id, CategoryId = category.Id, Status = BookStatus.Owned };
        db.Books.AddRange(listedBook, offeredBook);
        await db.SaveChangesAsync();

        var listing = new ExchangeListing { BookId = listedBook.Id, WantedType = "Effective Java" };
        db.ExchangeListings.Add(listing);
        await db.SaveChangesAsync();

        var request = new ExchangeRequest { ListingId = listing.Id, RequesterId = requester.Id, OfferedBookId = offeredBook.Id, Status = ExchangeRequestStatus.Accepted };
        db.ExchangeRequests.Add(request);
        await db.SaveChangesAsync();

        db.History.Add(new History { RequestId = request.Id, CompletedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        return (db, owner, requester, stranger);
    }

    [Fact]
    public async Task GetExchangeHistory_ReturnsUnauthorized_WhenAnonymous()
    {
        var (db, requester, _, _) = await SeedExchangeHistory();

        var controller = new UsersController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.GetExchangeHistory(requester.Id);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetExchangeHistory_ReturnsForbidden_ForAnotherUser()
    {
        var (db, owner, _, stranger) = await SeedExchangeHistory();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, stranger.Id, stranger.Role, stranger.Name);

        var result = await controller.GetExchangeHistory(owner.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetExchangeHistory_ReturnsOk_ForRequester()
    {
        var (db, _, requester, _) = await SeedExchangeHistory();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, requester.Id, requester.Role, requester.Name);

        var result = await controller.GetExchangeHistory(requester.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Single(history);
    }

    [Fact]
    public async Task GetExchangeHistory_ReturnsOk_ForListedBookOwner()
    {
        var (db, owner, _, _) = await SeedExchangeHistory();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.GetExchangeHistory(owner.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Single(history);
    }

    [Fact]
    public async Task GetExchangeHistory_ReturnsOk_ForAdmin()
    {
        var (db, _, requester, _) = await SeedExchangeHistory();

        var controller = new UsersController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.GetExchangeHistory(requester.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var history = Assert.IsType<List<HistoryDto>>(ok.Value);
        Assert.Single(history);
    }
}