using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace BookMaster.Api.Extensions;

public static class ClaimsExtensions
{
    public static long GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return long.Parse(sub ?? string.Empty);
    }

    public static string GetUserRole(this ClaimsPrincipal principal) =>
        principal.FindFirstValue("role") ?? principal.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}