using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BookMaster.Mvc.Models;
using BookMaster.Mvc.Services;

namespace BookMaster.Mvc.Controllers;

public class AuthController : Controller
{
    private const string TokenCookie = "BookMaster.Token";
    private readonly BookApiClient _api;
    public AuthController(BookApiClient api) => _api = api;

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewBag.ReturnUrl = returnUrl;
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginVm vm, string? returnUrl = null)
    {
        var response = await _api.LoginAsync(vm);
        if (!response.IsSuccessStatusCode)
        {
            ModelState.AddModelError(string.Empty, "Invalid email or password.");
            ViewBag.ReturnUrl = returnUrl;
            return View(vm);
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponseVm>();
        if (auth == null || string.IsNullOrWhiteSpace(auth.Token) || auth.User == null)
        {
            ModelState.AddModelError(string.Empty, "Invalid email or password.");
            ViewBag.ReturnUrl = returnUrl;
            return View(vm);
        }

        await SignInAsync(auth);
        return RedirectToLocal(returnUrl);
    }

    [HttpGet]
    public IActionResult Register() => View();

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterVm vm)
    {
        var response = await _api.RegisterAsync(vm);
        if (!response.IsSuccessStatusCode)
        {
            ModelState.AddModelError(string.Empty, "Could not register. Email may already be in use.");
            return View(vm);
        }

        var auth = await response.Content.ReadFromJsonAsync<AuthResponseVm>();
        if (auth == null || string.IsNullOrWhiteSpace(auth.Token) || auth.User == null)
        {
            ModelState.AddModelError(string.Empty, "Could not register.");
            return View(vm);
        }

        await SignInAsync(auth);
        return RedirectToAction("Index", "Home");
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        Response.Cookies.Delete(TokenCookie);
        return RedirectToAction("Index", "Home");
    }

    [Authorize]
    public IActionResult Status() => Ok(User.Identity?.Name);

    private async Task SignInAsync(AuthResponseVm auth)
    {
        var user = auth.User!;
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });

        Response.Cookies.Append(TokenCookie, auth.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddHours(8)
        });
    }

    private IActionResult RedirectToLocal(string? returnUrl)
    {
        if (!string.IsNullOrEmpty(returnUrl) && Url.IsLocalUrl(returnUrl))
            return Redirect(returnUrl);
        return RedirectToAction("Index", "Home");
    }
}