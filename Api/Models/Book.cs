using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BookMaster.Api.Models;

public static class BookStatus
{
    public const string Owned = "OWNED";
    public const string Listed = "LISTED";
    public const string Exchanged = "EXCHANGED";

    public static bool IsValid(string status) => status is Owned or Listed or Exchanged;
}

public class Book
{
    public long Id { get; set; }

    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    [Column("author")]
    [MaxLength(255)]
    public string Author { get; set; } = string.Empty;

    [Column("owner_id")]
    public long OwnerId { get; set; }
    public User? Owner { get; set; }

    [Column("category_id")]
    public long CategoryId { get; set; }
    public Category? Category { get; set; }

    [Column("price")]
    [Precision(18, 2)]
    public decimal Price { get; set; }

    [Column("is_catalogue")]
    public bool IsCatalogue { get; set; }

    [Required, MaxLength(50)]
    public string Status { get; set; } = BookStatus.Owned;

    [Column("pdf_url")]
    [MaxLength(500)]
    public string? PdfUrl { get; set; }

    public ExchangeListing? ExchangeListing { get; set; }
    public ICollection<ExchangeRequest> OfferedInRequests { get; set; } = new List<ExchangeRequest>();
}
