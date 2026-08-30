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
public class ExchangeRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExchangeRequestsController(AppDbContext db) => _db = db;

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<ExchangeRequestDto>>> GetAll()
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();

        var query = _db.ExchangeRequests.AsQueryable();
        if (User.GetUserRole() != Roles.Admin)
        {
            var userId = User.GetUserId();
            query = query.Where(r => r.RequesterId == userId
                || r.Listing!.Book!.OwnerId == userId
                || r.OfferedBook!.OwnerId == userId);
        }

        var requests = await query
            .Select(r => new ExchangeRequestDto(r.Id, r.ListingId, r.RequesterId, r.OfferedBookId, r.Status))
            .ToListAsync();
        return Ok(requests);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<ActionResult<ExchangeRequestDto>> GetById(long id)
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();

        var r = await _db.ExchangeRequests
            .Include(x => x.Listing!).ThenInclude(l => l.Book)
            .Include(x => x.OfferedBook)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (r == null) return NotFound();

        var userId = User.GetUserId();
        if (User.GetUserRole() != Roles.Admin
            && r.RequesterId != userId
            && r.Listing!.Book!.OwnerId != userId
            && r.OfferedBook!.OwnerId != userId)
            return Forbid();

        return Ok(new ExchangeRequestDto(r.Id, r.ListingId, r.RequesterId, r.OfferedBookId, r.Status));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ExchangeRequestDto>> Create(CreateExchangeRequestDto dto)
    {
        var requesterId = User.GetUserId();
        if (!await _db.Users.AnyAsync(u => u.Id == requesterId))
            return Unauthorized("Account no longer exists.");

        var listing = await _db.ExchangeListings.Include(l => l.Book).FirstOrDefaultAsync(l => l.Id == dto.ListingId);
        if (listing == null || listing.Book == null) return BadRequest("Listing does not exist.");

        if (listing.Book.Status != BookStatus.Listed)
            return BadRequest("Listing is no longer active.");

        var offeredBook = await _db.Books.FindAsync(dto.OfferedBookId);
        if (offeredBook == null) return BadRequest("Offered book does not exist.");

        if (offeredBook.OwnerId != requesterId)
            return BadRequest("You must own the offered book.");

        if (offeredBook.Status != BookStatus.Owned && offeredBook.Status != BookStatus.Listed)
            return BadRequest("Offered book is not available for exchange.");

        if (offeredBook.Id == listing.Book.Id)
            return BadRequest("Cannot offer the listed book itself.");

        if (listing.Book.OwnerId == requesterId)
            return BadRequest("Cannot request an exchange on your own listing.");

        var duplicate = await _db.ExchangeRequests.AnyAsync(r =>
            r.ListingId == dto.ListingId && r.RequesterId == requesterId && r.Status == ExchangeRequestStatus.Pending);
        if (duplicate) return Conflict("You already have a pending request on this listing.");

        var request = new ExchangeRequest
        {
            ListingId = dto.ListingId,
            RequesterId = requesterId,
            OfferedBookId = dto.OfferedBookId,
            Status = ExchangeRequestStatus.Pending
        };
        _db.ExchangeRequests.Add(request);

        _db.Notifications.Add(new Notification { UserId = listing.Book.OwnerId, IsRead = false });

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, new ExchangeRequestDto(request.Id, request.ListingId, request.RequesterId, request.OfferedBookId, request.Status));
    }

    [HttpPost("{id}/accept")]
    [Authorize]
    public async Task<IActionResult> Accept(long id)
    {
        var request = await _db.ExchangeRequests
            .Include(r => r.Listing!).ThenInclude(l => l.Book)
            .Include(r => r.OfferedBook)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (request == null) return NotFound();
        if (request.Status != ExchangeRequestStatus.Pending) return Conflict("Request already processed.");

        var listingBook = request.Listing!.Book!;
        var offeredBook = request.OfferedBook!;

        if (listingBook.OwnerId != User.GetUserId())
            return Forbid();

        return _db.Database.IsRelational()
            ? await AcceptRelationalAsync(id, request, listingBook, offeredBook)
            : await AcceptSequentialAsync(request, listingBook, offeredBook);
    }

    private async Task<IActionResult> AcceptSequentialAsync(ExchangeRequest request, Book listingBook, Book offeredBook)
    {
        if (offeredBook.Status != BookStatus.Owned && offeredBook.Status != BookStatus.Listed)
            return Conflict("Offered book is no longer available.");

        var ownerId = listingBook.OwnerId;
        var requesterId = request.RequesterId;

        listingBook.OwnerId = requesterId;
        listingBook.Status = BookStatus.Exchanged;

        offeredBook.OwnerId = ownerId;
        offeredBook.Status = BookStatus.Exchanged;

        request.Status = ExchangeRequestStatus.Accepted;

        await CancelPendingSiblingRequestsAsync(request);
        await UnlistOfferedBookAsync(offeredBook);

        _db.History.Add(new History { RequestId = request.Id, CompletedAt = DateTime.UtcNow });
        _db.Notifications.Add(new Notification { UserId = requesterId, IsRead = false });
        _db.Notifications.Add(new Notification { UserId = ownerId, IsRead = false });

        await _db.SaveChangesAsync();
        return NoContent();
    }

    private async Task UnlistOfferedBookAsync(Book offeredBook)
    {
        var offeredListing = await _db.ExchangeListings
            .FirstOrDefaultAsync(l => l.BookId == offeredBook.Id);
        if (offeredListing == null) return;

        var pending = await _db.ExchangeRequests
            .Where(r => r.ListingId == offeredListing.Id && r.Status == ExchangeRequestStatus.Pending)
            .ToListAsync();

        _db.ExchangeRequests.RemoveRange(pending);
        _db.ExchangeListings.Remove(offeredListing);
    }

    private async Task<IActionResult> AcceptRelationalAsync(long id, ExchangeRequest request, Book listingBook, Book offeredBook)
    {
        var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var ownerId = listingBook.OwnerId;
            var requesterId = request.RequesterId;

            var claimedRequest = await _db.ExchangeRequests
                .Where(r => r.Id == id && r.Status == ExchangeRequestStatus.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, ExchangeRequestStatus.Accepted));
            if (claimedRequest == 0)
            {
                await transaction.RollbackAsync();
                return Conflict("Request already processed.");
            }

            var claimedOffered = await _db.Books
                .Where(b => b.Id == offeredBook.Id
                    && (b.Status == BookStatus.Owned || b.Status == BookStatus.Listed))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(b => b.OwnerId, ownerId)
                    .SetProperty(b => b.Status, BookStatus.Exchanged));
            if (claimedOffered == 0)
            {
                await transaction.RollbackAsync();
                return Conflict("Offered book is no longer available.");
            }

            var claimedListing = await _db.Books
                .Where(b => b.Id == listingBook.Id && b.Status == BookStatus.Listed)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(b => b.OwnerId, requesterId)
                    .SetProperty(b => b.Status, BookStatus.Exchanged));
            if (claimedListing == 0)
            {
                await transaction.RollbackAsync();
                return Conflict("Listing is no longer active.");
            }

            await CancelPendingSiblingRequestsAsync(request);
            await UnlistOfferedBookAsync(offeredBook);

            _db.History.Add(new History { RequestId = request.Id, CompletedAt = DateTime.UtcNow });
            _db.Notifications.Add(new Notification { UserId = requesterId, IsRead = false });
            _db.Notifications.Add(new Notification { UserId = ownerId, IsRead = false });

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return NoContent();
        }
        catch (DbUpdateException ex) when (SqlErrors.IsUniqueConstraintViolation(ex))
        {
            await transaction.RollbackAsync();
            return Conflict("Request already processed.");
        }
        finally
        {
            await transaction.DisposeAsync();
        }
    }

    private async Task CancelPendingSiblingRequestsAsync(ExchangeRequest request)
    {
        var siblings = await _db.ExchangeRequests
            .Where(r => r.ListingId == request.ListingId && r.Id != request.Id && r.Status == ExchangeRequestStatus.Pending)
            .ToListAsync();
        foreach (var sibling in siblings)
        {
            sibling.Status = ExchangeRequestStatus.Rejected;
            _db.Notifications.Add(new Notification { UserId = sibling.RequesterId, IsRead = false });
        }
    }

    [HttpPost("{id}/reject")]
    [Authorize]
    public async Task<IActionResult> Reject(long id)
    {
        var request = await _db.ExchangeRequests.Include(r => r.Listing!).ThenInclude(l => l.Book).FirstOrDefaultAsync(r => r.Id == id);
        if (request == null) return NotFound();
        if (request.Status != ExchangeRequestStatus.Pending) return Conflict("Request already processed.");

        if (request.Listing!.Book!.OwnerId != User.GetUserId())
            return Forbid();

        request.Status = ExchangeRequestStatus.Rejected;
        _db.Notifications.Add(new Notification { UserId = request.RequesterId, IsRead = false });

        await _db.SaveChangesAsync();
        return NoContent();
    }
}