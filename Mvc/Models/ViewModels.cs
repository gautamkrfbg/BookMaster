namespace BookMaster.Mvc.Models;

public class UserVm
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public class CategoryVm
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class BookVm
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public long OwnerId { get; set; }
    public long CategoryId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class CreateBookVm
{
    public string Title { get; set; } = string.Empty;
    public long CategoryId { get; set; }
}

public class ExchangeListingVm
{
    public long Id { get; set; }
    public long BookId { get; set; }
    public string WantedType { get; set; } = string.Empty;
}

public class CreateExchangeListingVm
{
    public long BookId { get; set; }
    public string WantedType { get; set; } = string.Empty;
}

public class ExchangeRequestVm
{
    public long Id { get; set; }
    public long ListingId { get; set; }
    public long RequesterId { get; set; }
    public long OfferedBookId { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class CreateExchangeRequestVm
{
    public long ListingId { get; set; }
    public long OfferedBookId { get; set; }
}

public class NotificationVm
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public bool IsRead { get; set; }
}

public class HistoryVm
{
    public long Id { get; set; }
    public long RequestId { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class LoginVm
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RegisterVm
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class AuthResponseVm
{
    public string Token { get; set; } = string.Empty;
    public UserVm? User { get; set; }
}

public class AdminStatsVm
{
    public int Users { get; set; }
    public int Books { get; set; }
    public int Categories { get; set; }
    public int Listings { get; set; }
    public int Requests { get; set; }
    public int PendingRequests { get; set; }
    public int ExchangesCompleted { get; set; }
}