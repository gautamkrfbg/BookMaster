using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Extensions;
using BookMaster.Api.Models;

namespace BookMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = Roles.Admin)]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminController(AppDbContext db) => _db = db;

    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> GetStats()
    {
        var stats = new AdminStatsDto(
            Users: await _db.Users.CountAsync(),
            Books: await _db.Books.CountAsync(),
            Categories: await _db.Categories.CountAsync(),
            Listings: await _db.ExchangeListings.CountAsync(),
            Requests: await _db.ExchangeRequests.CountAsync(),
            PendingRequests: await _db.ExchangeRequests.CountAsync(r => r.Status == ExchangeRequestStatus.Pending),
            ExchangesCompleted: await _db.History.CountAsync());
        return Ok(stats);
    }

    [HttpPost("books")]
    public async Task<ActionResult<BookDto>> CreateBook(CreateAdminBookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(dto.Author)) return BadRequest("Author is required.");

        var admin = await _db.Users.FindAsync(User.GetUserId());
        if (admin == null) return Unauthorized("Account no longer exists.");

        if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
            return BadRequest("Category does not exist.");

        var book = new Book
        {
            Title = dto.Title.Trim(),
            Author = dto.Author.Trim(),
            OwnerId = admin.Id,
            CategoryId = dto.CategoryId,
            Price = dto.Price,
            IsCatalogue = true,
            Status = BookStatus.Owned
        };
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(BooksController.GetById), "Books", new { id = book.Id }, new BookDto(book.Id, book.Title, book.Author, book.OwnerId, book.CategoryId, book.Status, book.Price, book.IsCatalogue));
    }
}