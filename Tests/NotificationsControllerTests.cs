using Microsoft.AspNetCore.Mvc;
using BookMaster.Api.Controllers;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Models;
using Xunit;

namespace BookMaster.Tests;

public class NotificationsControllerTests
{
    private static async Task<(AppDbContext db, User owner, User other, Notification note)> Seed()
    {
        var db = TestDbFactory.Create();
        var owner = new User { Name = "Alice", Email = "alice@example.com", PasswordHash = "x", Role = "USER" };
        var other = new User { Name = "Bob", Email = "bob@example.com", PasswordHash = "x", Role = "USER" };
        db.Users.AddRange(owner, other);
        await db.SaveChangesAsync();

        var note = new Notification { UserId = owner.Id, IsRead = false };
        db.Notifications.Add(note);
        await db.SaveChangesAsync();

        return (db, owner, other, note);
    }

    [Fact]
    public async Task GetById_ReturnsUnauthorized_WhenAnonymous()
    {
        var (db, _, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.GetById(note.Id);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsForbidden_ForAnotherUser()
    {
        var (db, _, other, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, other.Id, other.Role, other.Name);

        var result = await controller.GetById(note.Id);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsOk_ForOwner()
    {
        var (db, owner, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.GetById(note.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<NotificationDto>(ok.Value);
        Assert.Equal(note.Id, dto.Id);
        Assert.Equal(owner.Id, dto.UserId);
        Assert.False(dto.IsRead);
    }

    [Fact]
    public async Task GetById_ReturnsOk_ForAdmin()
    {
        var (db, _, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.GetById(note.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<NotificationDto>(ok.Value);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        var (db, owner, _, _) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.GetById(99999);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task MarkRead_ReturnsUnauthorized_WhenAnonymous()
    {
        var (db, _, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetAnonymous(controller);

        var result = await controller.MarkRead(note.Id);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task MarkRead_ReturnsForbidden_ForAnotherUser()
    {
        var (db, _, other, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, other.Id, other.Role, other.Name);

        var result = await controller.MarkRead(note.Id);

        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task MarkRead_ReturnsNoContent_AndTogglesRead_ForOwner()
    {
        var (db, owner, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, owner.Id, owner.Role, owner.Name);

        var result = await controller.MarkRead(note.Id);

        Assert.IsType<NoContentResult>(result);
        var refreshed = await db.Notifications.FindAsync(note.Id);
        Assert.True(refreshed!.IsRead);
    }

    [Fact]
    public async Task MarkRead_ReturnsNoContent_ForAdmin()
    {
        var (db, _, _, note) = await Seed();
        var controller = new NotificationsController(db);
        TestAuth.SetUser(controller, 999, "ADMIN", "Admin");

        var result = await controller.MarkRead(note.Id);

        Assert.IsType<NoContentResult>(result);
    }
}