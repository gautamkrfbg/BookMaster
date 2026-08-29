using System.ComponentModel.DataAnnotations;

namespace BookMaster.Api.Models;

public static class Roles
{
    public const string User = "USER";
    public const string Admin = "ADMIN";
}

public class User
{
    public long Id { get; set; }

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(512)]
    public string PasswordHash { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "USER";

    public ICollection<Book> Books { get; set; } = new List<Book>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<ExchangeRequest> ExchangeRequests { get; set; } = new List<ExchangeRequest>();
}
