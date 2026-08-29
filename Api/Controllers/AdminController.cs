using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
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
}