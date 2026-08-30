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
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet("{id}")]
    [Authorize]
    public async Task<ActionResult<NotificationDto>> GetById(long id)
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();
        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();
        if (n.UserId != User.GetUserId() && User.GetUserRole() != Roles.Admin)
            return Forbid();
        return Ok(new NotificationDto(n.Id, n.UserId, n.IsRead));
    }

    [HttpPost("{id}/read")]
    [Authorize]
    public async Task<IActionResult> MarkRead(long id)
    {
        if (!User.Identity!.IsAuthenticated) return Unauthorized();
        var n = await _db.Notifications.FindAsync(id);
        if (n == null) return NotFound();
        if (n.UserId != User.GetUserId() && User.GetUserRole() != Roles.Admin)
            return Forbid();

        n.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}