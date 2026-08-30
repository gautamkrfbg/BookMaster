# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY BookMaster.sln ./
COPY Api/*.csproj ./Api/
COPY Mvc/*.csproj ./Mvc/
COPY Tests/*.csproj ./Tests/

RUN dotnet restore ./Mvc/Mvc.csproj

# Copies the whole repo, including Mvc/appsettings.json exactly as you've
# configured it per the README's Setup step 4 (ApiBaseUrl set).
COPY . .
WORKDIR /src/Mvc
RUN dotnet publish -c Release -o /app/publish --no-restore

# ---------- Runtime stage ----------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8081
EXPOSE 8081

ENTRYPOINT ["dotnet", "Mvc.dll"]
