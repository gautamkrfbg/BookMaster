using BookMaster.Api.Data;
using BookMaster.Api.Models;
using BookMaster.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace BookMaster.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        var adminEmail = (config["Admin:Email"] ?? "admin@bookmaster.local").Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Role == Roles.Admin || u.Email == adminEmail))
            return;

        var password = config["Admin:Password"] ?? "Admin@123";
        db.Users.Add(new User
        {
            Name = "Administrator",
            Email = adminEmail,
            PasswordHash = PasswordHasher.Hash(password),
            Role = Roles.Admin
        });
        await db.SaveChangesAsync();
    }
}