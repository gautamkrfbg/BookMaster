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
[Authorize(Roles = Roles.Admin)]
public class AdminController : ControllerBase
{
    private static readonly string[] AllowedPdfContentTypes = { "application/pdf" };
    private const long MaxPdfBytes = 10 * 1024 * 1024; // 10 MB

    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    public AdminController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

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

    [HttpPost("books")]
    [RequestSizeLimit(MaxPdfBytes)]
    public async Task<ActionResult<BookDto>> CreateBook([FromForm] CreateAdminBookForm dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        if (string.IsNullOrWhiteSpace(dto.Author)) return BadRequest("Author is required.");

        var admin = await _db.Users.FindAsync(User.GetUserId());
        if (admin == null) return Unauthorized("Account no longer exists.");

        if (!await _db.Categories.AnyAsync(c => c.Id == dto.CategoryId))
            return BadRequest("Category does not exist.");

        string? pdfUrl = null;
        if (dto.Pdf != null)
        {
            var validationError = ValidatePdf(dto.Pdf);
            if (validationError != null) return BadRequest(validationError);
            pdfUrl = await SavePdfAsync(dto.Pdf);
        }

        var book = new Book
        {
            Title = dto.Title.Trim(),
            Author = dto.Author.Trim(),
            OwnerId = admin.Id,
            CategoryId = dto.CategoryId,
            Price = dto.Price,
            IsCatalogue = true,
            Status = BookStatus.Owned,
            PdfUrl = pdfUrl
        };
        _db.Books.Add(book);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(BooksController.GetById), "Books", new { id = book.Id }, new BookDto(book.Id, book.Title, book.Author, book.OwnerId, book.CategoryId, book.Status, book.Price, book.IsCatalogue, book.PdfUrl));
    }

    [HttpPost("books/{id}/pdf")]
    [RequestSizeLimit(MaxPdfBytes)]
    public async Task<ActionResult<BookDto>> UploadBookPdf(long id, IFormFile pdf)
    {
        var book = await _db.Books.FindAsync(id);
        if (book == null) return NotFound();

        var validationError = ValidatePdf(pdf);
        if (validationError != null) return BadRequest(validationError);

        DeletePdfIfExists(book.PdfUrl);
        book.PdfUrl = await SavePdfAsync(pdf);
        await _db.SaveChangesAsync();

        return Ok(new BookDto(book.Id, book.Title, book.Author, book.OwnerId, book.CategoryId, book.Status, book.Price, book.IsCatalogue, book.PdfUrl));
    }

    private static string? ValidatePdf(IFormFile? pdf)
    {
        if (pdf == null || pdf.Length == 0) return "A PDF file is required.";
        if (pdf.Length > MaxPdfBytes) return "The PDF must be smaller than 50 MB.";
        if (!AllowedPdfContentTypes.Contains(pdf.ContentType) &&
            !Path.GetExtension(pdf.FileName).Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            return "Only PDF files are allowed.";
        }
        return null;
    }

    private async Task<string> SavePdfAsync(IFormFile pdf)
    {
        var uploadsRoot = Path.Combine(_env.ContentRootPath, "uploads", "books");
        Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid():N}.pdf";
        var fullPath = Path.Combine(uploadsRoot, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await pdf.CopyToAsync(stream);
        }

        return $"/api/uploads/books/{fileName}";
    }

    private void DeletePdfIfExists(string? pdfUrl)
    {
        if (string.IsNullOrWhiteSpace(pdfUrl)) return;
        var fileName = Path.GetFileName(pdfUrl);
        var fullPath = Path.Combine(_env.ContentRootPath, "uploads", "books", fileName);
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }
    }
}