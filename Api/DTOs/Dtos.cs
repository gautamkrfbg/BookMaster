using System.ComponentModel.DataAnnotations;

namespace BookMaster.Api.DTOs;

public record UserDto(long Id, string Name, string Email, string Role);
public record RegisterDto(
    [Required, MaxLength(255)] string Name,
    [Required, MaxLength(255)] string Email,
    [Required, StringLength(128, MinimumLength = 6)] string Password);
public record LoginDto(
    [Required, MaxLength(255)] string Email,
    [Required, MaxLength(128)] string Password);
public record UpdateUserDto(
    [Required, MaxLength(255)] string Name,
    [Required, MaxLength(255)] string Email,
    [StringLength(128, MinimumLength = 6)] string? Password);
public record AuthResponseDto(string Token, UserDto User);

public record CategoryDto(long Id, string Name);
public record CreateCategoryDto([Required, MaxLength(255)] string Name);

public record BookDto(long Id, string Title, string Author, long OwnerId, long CategoryId, string Status, decimal Price, bool IsCatalogue);
public record CreateBookDto([Required, MaxLength(255)] string Title, long CategoryId, [MaxLength(255)] string? Author = null);
public record UpdateBookDto([Required, MaxLength(255)] string Title, long CategoryId, [Required, MaxLength(50)] string Status);

public record CreateAdminBookDto(
    [Required, MaxLength(255)] string Title,
    [Required, MaxLength(255)] string Author,
    long CategoryId,
    [Range(0.01, 99999999.99)] decimal Price);

public record NotificationDto(long Id, long UserId, bool IsRead);

public record ExchangeListingDto(long Id, long BookId, string WantedType);
public record CreateExchangeListingDto(long BookId, [Required, MaxLength(100)] string WantedType);

public record ExchangeRequestDto(long Id, long ListingId, long RequesterId, long OfferedBookId, string Status);
public record CreateExchangeRequestDto(long ListingId, long OfferedBookId);

public record HistoryDto(long Id, long RequestId, DateTime? CompletedAt);

public record AdminStatsDto(int Users, int Books, int Categories, int Listings, int Requests, int PendingRequests, int ExchangesCompleted);