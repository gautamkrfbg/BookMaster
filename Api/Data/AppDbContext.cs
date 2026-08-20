using Microsoft.EntityFrameworkCore;
using BookMaster.Api.Models;

namespace BookMaster.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ExchangeListing> ExchangeListings => Set<ExchangeListing>();
    public DbSet<ExchangeRequest> ExchangeRequests => Set<ExchangeRequest>();
    public DbSet<History> History => Set<History>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.ToTable("categories");
        });

        modelBuilder.Entity<Book>(e =>
        {
            e.ToTable("books");
            e.HasOne(b => b.Owner)
                .WithMany(u => u.Books)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(b => b.Category)
                .WithMany(c => c.Books)
                .HasForeignKey(b => b.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Notification>(e =>
        {
            e.ToTable("notifications");
            e.HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExchangeListing>(e =>
        {
            e.ToTable("exchange_listings");
            e.HasOne(l => l.Book)
                .WithOne(b => b.ExchangeListing)
                .HasForeignKey<ExchangeListing>(l => l.BookId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExchangeRequest>(e =>
        {
            e.ToTable("exchange_requests");
            e.HasOne(r => r.Listing)
                .WithMany(l => l.ExchangeRequests)
                .HasForeignKey(r => r.ListingId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Requester)
                .WithMany(u => u.ExchangeRequests)
                .HasForeignKey(r => r.RequesterId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.OfferedBook)
                .WithMany(b => b.OfferedInRequests)
                .HasForeignKey(r => r.OfferedBookId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<History>(e =>
        {
            e.ToTable("history");
            e.HasOne(h => h.Request)
                .WithOne(r => r.History)
                .HasForeignKey<History>(h => h.RequestId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
