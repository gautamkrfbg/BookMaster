using System.Net.Http.Headers;

namespace BookMaster.Mvc.Services;

public class AuthHeaderHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _accessor;
    public AuthHeaderHandler(IHttpContextAccessor accessor) => _accessor = accessor;

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var token = _accessor.HttpContext?.Request.Cookies["BookMaster.Token"];
        if (!string.IsNullOrWhiteSpace(token))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return base.SendAsync(request, cancellationToken);
    }
}