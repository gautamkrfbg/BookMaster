using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Data;
using BookMaster.Api.DTOs;
using BookMaster.Api.Extensions;
using BookMaster.Api.Models;
using BookMaster.Api.Services;

namespace BookMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly TokenService _tokens;
    public AuthController(AppDbContext db, TokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Name is required.");
        if (string.IsNullOrWhiteSpace(dto.Email)) return BadRequest("Email is required.");
        if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Trim().Length < 6)
            return BadRequest("Password must be at least 6 characters.");

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            return Conflict("Email already registered.");

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = email,
            PasswordHash = PasswordHasher.Hash(dto.Password),
            Role = Roles.User
        };
        _db.Users.Add(user);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (SqlErrors.IsUniqueConstraintViolation(ex))
        {
            return Conflict("Email already registered.");
        }

        return CreatedAtAction(nameof(Login), new { }, BuildResponse(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email)) return BadRequest("Email is required.");
        if (string.IsNullOrEmpty(dto.Password)) return BadRequest("Password is required.");

        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == email);
        if (user == null || !PasswordHasher.Verify(dto.Password, user.PasswordHash))
            return Unauthorized("Invalid email or password.");

        return Ok(BuildResponse(user));
    }

    private AuthResponseDto BuildResponse(User user) =>
        new(_tokens.CreateToken(user), new UserDto(user.Id, user.Name, user.Email, user.Role));
}