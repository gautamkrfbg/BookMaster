using Microsoft.AspNetCore.Mvc;
using BookMaster.Mvc.Models;
using BookMaster.Mvc.Services;

namespace BookMaster.Mvc.Controllers;

public class UsersController : Controller
{
    private readonly BookApiClient _api;
    public UsersController(BookApiClient api) => _api = api;

    public async Task<IActionResult> Index()
    {
        var users = await _api.GetUsersAsync();
        return View(users);
    }

    public async Task<IActionResult> Details(long id)
    {
        var user = await _api.GetUserAsync(id);
        if (user == null) return NotFound();

        ViewBag.Library = await _api.GetUserLibraryAsync(id);
        ViewBag.History = await _api.GetUserExchangeHistoryAsync(id);
        return View(user);
    }
}