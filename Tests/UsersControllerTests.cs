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
}