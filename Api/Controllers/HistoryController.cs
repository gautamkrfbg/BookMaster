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
public class HistoryController : ControllerBase
{
    private readonly AppDbContext _db;
    public HistoryController(AppDbContext db) => _db = db;

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<HistoryDto>>> GetAll()
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();

        var query = _db.History.AsQueryable();
        if (User.GetUserRole() != Roles.Admin)
        {
            var userId = User.GetUserId();
            query = query.Where(h => h.Request!.RequesterId == userId
                || h.Request!.Listing!.Book!.OwnerId == userId);
        }

        var history = await query
            .Select(h => new HistoryDto(h.Id, h.RequestId, h.CompletedAt))
            .ToListAsync();
        return Ok(history);
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<ActionResult<HistoryDto>> GetById(long id)
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();

        var h = await _db.History
            .Include(x => x.Request!).ThenInclude(r => r.Listing!).ThenInclude(l => l.Book)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (h == null) return NotFound();

        var userId = User.GetUserId();
        if (User.GetUserRole() != Roles.Admin
            && h.Request!.RequesterId != userId
            && h.Request!.Listing!.Book!.OwnerId != userId)
            return Forbid();

        return Ok(new HistoryDto(h.Id, h.RequestId, h.CompletedAt));
    }
}