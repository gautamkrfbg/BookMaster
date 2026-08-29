using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Data;
using BookMaster.Api.Extensions;
using BookMaster.Api.Models;
using BookMaster.Api.DTOs;

namespace BookMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly AppDbContext _db;
    public BooksController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BookDto>>> GetAll([FromQuery] string? search, [FromQuery] long? categoryId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Books.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.Title.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(b => b.CategoryId == categoryId.Value);

        var books = await query
            .OrderBy(b => b.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BookDto(b.Id, b.Title, b.OwnerId, b.CategoryId, b.Status))
            .ToListAsync();

        return Ok(books);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BookDto>> GetById(long id)
    {
        var b = await _db.Books.FindAsync(id);
        if (b == null) return NotFound();
        return Ok(new BookDto(b.Id, b.Title, b.OwnerId, b.CategoryId, b.Status));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<BookDto>> Create(CreateBookDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        var ownerId = User.GetUserId();
        if (!await _db.Users.AnyAsync(u => u.Id == ownerId))
            return Unauthorized("Account no longer exists.");

        var categoryExists = await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId);
        if (!categoryExists) return BadRequest("Category does not exist.");

        var book = new Book
        {
            Title = dto.Title.Trim(),
            OwnerId = ownerId,
            CategoryId = dto.CategoryId,
            Status = BookStatus.Owned
        };
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = book.Id }, new BookDto(book.Id, book.Title, book.OwnerId, book.CategoryId, book.Status));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Update(long id, UpdateBookDto dto)
    {
        var book = await _db.Books.FindAsync(id);
        if (book == null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");

        if (!BookStatus.IsValid(dto.Status))
            return BadRequest("Invalid status.");

        if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
            return BadRequest("Category does not exist.");

        book.Title = dto.Title.Trim();
        book.CategoryId = dto.CategoryId;
        book.Status = dto.Status;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(long id)
    {
        var book = await _db.Books.FindAsync(id);
        if (book == null) return NotFound();

        var referenced = await _db.ExchangeRequests.AnyAsync(r => r.OfferedBookId == id || r.Listing!.BookId == id);
        if (referenced) return Conflict("Book is referenced by exchange activity and cannot be deleted.");

        _db.Books.Remove(book);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}