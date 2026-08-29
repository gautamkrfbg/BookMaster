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
public class ExchangeListingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExchangeListingsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExchangeListingDto>>> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var listings = await _db.ExchangeListings
            .OrderBy(l => l.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new ExchangeListingDto(l.Id, l.BookId, l.WantedType))
            .ToListAsync();
        return Ok(listings);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExchangeListingDto>> GetById(long id)
    {
        var l = await _db.ExchangeListings.FindAsync(id);
        if (l == null) return NotFound();
        return Ok(new ExchangeListingDto(l.Id, l.BookId, l.WantedType));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ExchangeListingDto>> Create(CreateExchangeListingDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.WantedType)) return BadRequest("Wanted type is required.");

        var book = await _db.Books.FindAsync(dto.BookId);
        if (book == null) return BadRequest("Book does not exist.");

        if (book.OwnerId != User.GetUserId())
            return BadRequest("You can only list books you own.");

        if (book.Status != BookStatus.Owned)
            return BadRequest("Only books you own and are not already listed/exchanged can be listed.");

        var alreadyListed = await _db.ExchangeListings.AnyAsync(l => l.BookId == dto.BookId);
        if (alreadyListed) return Conflict("Book is already listed for exchange.");

        var listing = new ExchangeListing { BookId = dto.BookId, WantedType = dto.WantedType.Trim() };
        _db.ExchangeListings.Add(listing);

        book.Status = BookStatus.Listed;

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = listing.Id }, new ExchangeListingDto(listing.Id, listing.BookId, listing.WantedType));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(long id)
    {
        var listing = await _db.ExchangeListings.Include(l => l.Book).FirstOrDefaultAsync(l => l.Id == id);
        if (listing == null) return NotFound();

        if (await _db.ExchangeRequests.AnyAsync(r => r.ListingId == id))
            return Conflict("Listing has exchange requests and cannot be deleted.");

        if (listing.Book != null && listing.Book.Status == BookStatus.Listed)
            listing.Book.Status = BookStatus.Owned;

        _db.ExchangeListings.Remove(listing);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}