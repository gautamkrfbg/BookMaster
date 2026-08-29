using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookMaster.Mvc.Models;
using BookMaster.Mvc.Services;

namespace BookMaster.Mvc.Controllers;

public class ExchangeController : Controller
{
    private readonly BookApiClient _api;
    public ExchangeController(BookApiClient api) => _api = api;

    public async Task<IActionResult> Listings()
    {
        var listings = await _api.GetListingsAsync();
        return View(listings);
    }

    [Authorize]
    public async Task<IActionResult> CreateListing()
    {
        ViewBag.Books = await _api.GetBooksAsync();
        return View();
    }

    [Authorize]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateListing(CreateExchangeListingVm listing)
    {
        var response = await _api.CreateListingAsync(listing);
        if (!response.IsSuccessStatusCode)
        {
            ModelState.AddModelError(string.Empty, "Could not create listing.");
            ViewBag.Books = await _api.GetBooksAsync();
            return View(listing);
        }
        return RedirectToAction(nameof(Listings));
    }

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteListing(long id)
    {
        await _api.DeleteListingAsync(id);
        return RedirectToAction(nameof(Listings));
    }

    public async Task<IActionResult> Requests()
    {
        var requests = await _api.GetRequestsAsync();
        return View(requests);
    }

    [Authorize]
    public async Task<IActionResult> CreateRequest()
    {
        ViewBag.Listings = await _api.GetListingsAsync();
        ViewBag.Books = await _api.GetBooksAsync();
        return View();
    }

    [Authorize]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateRequest(CreateExchangeRequestVm request)
    {
        var response = await _api.CreateRequestAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            ModelState.AddModelError(string.Empty, "Could not create request.");
            ViewBag.Listings = await _api.GetListingsAsync();
            ViewBag.Books = await _api.GetBooksAsync();
            return View(request);
        }
        return RedirectToAction(nameof(Requests));
    }

    [Authorize]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Accept(long id)
    {
        await _api.AcceptRequestAsync(id);
        return RedirectToAction(nameof(Requests));
    }

    [Authorize]
    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Reject(long id)
    {
        await _api.RejectRequestAsync(id);
        return RedirectToAction(nameof(Requests));
    }
}