using System.Net.Http.Json;
using BookMaster.Mvc.Models;

namespace BookMaster.Mvc.Services;

public class BookApiClient
{
    private readonly HttpClient _http;
    public BookApiClient(HttpClient http) => _http = http;

    // Auth
    public async Task<HttpResponseMessage> LoginAsync(LoginVm vm) =>
        await _http.PostAsJsonAsync("auth/login", new { vm.Email, vm.Password });

    public async Task<HttpResponseMessage> RegisterAsync(RegisterVm vm) =>
        await _http.PostAsJsonAsync("auth/register", new { vm.Name, vm.Email, vm.Password });

    // Users
    public async Task<List<UserVm>> GetUsersAsync() =>
        await _http.GetFromJsonAsync<List<UserVm>>("users") ?? new();

    public async Task<UserVm?> GetUserAsync(long id) =>
        await _http.GetFromJsonAsync<UserVm>($"users/{id}");

    public async Task<List<BookVm>> GetUserLibraryAsync(long id) =>
        await _http.GetFromJsonAsync<List<BookVm>>($"users/{id}/library") ?? new();

    // Categories
    public async Task<List<CategoryVm>> GetCategoriesAsync() =>
        await _http.GetFromJsonAsync<List<CategoryVm>>("categories") ?? new();

    // Books
    public async Task<List<BookVm>> GetBooksAsync(string? search = null, long? categoryId = null)
    {
        var query = new List<string>();
        if (!string.IsNullOrWhiteSpace(search))
            query.Add($"search={Uri.EscapeDataString(search)}");
        if (categoryId.HasValue)
            query.Add($"categoryId={categoryId.Value}");

        var url = query.Count == 0 ? "books" : $"books?{string.Join("&", query)}";
        return await _http.GetFromJsonAsync<List<BookVm>>(url) ?? new();
    }

    public async Task<BookVm?> GetBookAsync(long id) =>
        await _http.GetFromJsonAsync<BookVm>($"books/{id}");

    public async Task<HttpResponseMessage> CreateBookAsync(CreateBookVm book) =>
        await _http.PostAsJsonAsync("books", book);

    public async Task<HttpResponseMessage> DeleteBookAsync(long id) =>
        await _http.DeleteAsync($"books/{id}");

    // Exchange listings
    public async Task<List<ExchangeListingVm>> GetListingsAsync() =>
        await _http.GetFromJsonAsync<List<ExchangeListingVm>>("exchangelistings") ?? new();

    public async Task<HttpResponseMessage> CreateListingAsync(CreateExchangeListingVm listing) =>
        await _http.PostAsJsonAsync("exchangelistings", listing);

    public async Task<HttpResponseMessage> DeleteListingAsync(long id) =>
        await _http.DeleteAsync($"exchangelistings/{id}");

    // Exchange requests
    public async Task<List<ExchangeRequestVm>> GetRequestsAsync() =>
        await _http.GetFromJsonAsync<List<ExchangeRequestVm>>("exchangerequests") ?? new();

    public async Task<HttpResponseMessage> CreateRequestAsync(CreateExchangeRequestVm request) =>
        await _http.PostAsJsonAsync("exchangerequests", request);

    public async Task<HttpResponseMessage> AcceptRequestAsync(long id) =>
        await _http.PostAsync($"exchangerequests/{id}/accept", null);

    public async Task<HttpResponseMessage> RejectRequestAsync(long id) =>
        await _http.PostAsync($"exchangerequests/{id}/reject", null);

    // History
    public async Task<List<HistoryVm>> GetUserExchangeHistoryAsync(long userId) =>
        await _http.GetFromJsonAsync<List<HistoryVm>>($"users/{userId}/exchange-history") ?? new();

    // Admin
    public async Task<AdminStatsVm?> GetAdminStatsAsync() =>
        await _http.GetFromJsonAsync<AdminStatsVm>("admin/stats");
}