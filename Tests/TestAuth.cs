using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BookMaster.Tests;

public static class TestAuth
{
    public static void SetUser(ControllerBase controller, long id, string role = "USER", string name = "Test User")
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, id.ToString()),
            new Claim("name", name),
            new Claim("role", role)
        }, "TestAuth"));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }
}