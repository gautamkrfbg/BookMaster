using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookMaster.Mvc.Models;
using BookMaster.Mvc.Services;

namespace BookMaster.Mvc.Controllers;

[Authorize(Roles = "ADMIN")]
public class AdminController : Controller
{
    private readonly BookApiClient _api;
    public AdminController(BookApiClient api) => _api = api;

    public async Task<IActionResult> Index()
    {
        var stats = await _api.GetAdminStatsAsync();
        return View(stats ?? new AdminStatsVm());
    }
}