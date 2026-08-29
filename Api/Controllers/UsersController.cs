using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Data;
using BookMaster.Api.Extensions;
using BookMaster.Api.Models;
using BookMaster.Api.DTOs;
using BookMaster.Api.Services;

namespace BookMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public UsersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await _db.Users
            .Select(u => new UserDto(u.Id, u.Name, u.Email, u.Role))
            .ToListAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetById(long id)
    {
        var u = await _db.Users.FindAsync(id);
        if (u == null) return NotFound();
        return Ok(new UserDto(u.Id, u.Name, u.Email, u.Role));
    }

    [HttpGet("{id}/library")]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetLibrary(long id)
    {
        var exists = await _db.Users.AnyAsync(u => u.Id == id);
        if (!exists) return NotFound();

        var books = await _db.Books
            .Where(b => b.OwnerId == id)
            .Select(b => new BookDto(b.Id, b.Title, b.OwnerId, b.CategoryId, b.Status))
            .ToListAsync();
        return Ok(books);
    }

    [HttpGet("{id}/notifications")]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> GetNotifications(long id)
    {
        if (!User.Identity!.IsAuthenticated) return Forbid();
        if (id != User.GetUserId() && User.GetUserRole() != Roles.Admin)
            return Forbid();

        var notes = await _db.Notifications
            .Where(n => n.UserId == id)
            .Select(n => new NotificationDto(n.Id, n.UserId, n.IsRead))
            .ToListAsync();
        return Ok(notes);
    }

    [HttpGet("{id}/exchange-history")]
    public async Task<ActionResult<IEnumerable<HistoryDto>>> GetExchangeHistory(long id)
    {
        var history = await _db.History
            .Where(h => h.Request!.RequesterId == id
                || h.Request!.Listing!.Book!.OwnerId == id)
            .Select(h => new HistoryDto(h.Id, h.RequestId, h.CompletedAt))
            .ToListAsync();
        return Ok(history);
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(long id, UpdateUserDto dto)
    {
        if (id != User.GetUserId() && User.GetUserRole() != Roles.Admin)
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Email)) return BadRequest("Email is required.");
        if (!string.IsNullOrEmpty(dto.Password) && dto.Password.Trim().Length < 6)
            return BadRequest("Password must be at least 6 characters.");

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email && u.Id != id))
            return Conflict("Email already in use.");

        user.Name = dto.Name.Trim();
        user.Email = email;
        if (!string.IsNullOrWhiteSpace(dto.Password))
            user.PasswordHash = PasswordHasher.Hash(dto.Password);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqlErrors.IsUniqueConstraintViolation(ex))
        {
            return Conflict("Email already in use.");
        }
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(long id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var hasActivity = await _db.ExchangeRequests.AnyAsync(r =>
            r.RequesterId == id
            || r.OfferedBook!.OwnerId == id
            || r.Listing!.Book!.OwnerId == id);
        if (hasActivity) return Conflict("User has exchange activity and cannot be deleted.");

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}