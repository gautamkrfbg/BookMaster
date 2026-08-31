# BookMaster — Architecture Overview

## Solution layout

```
BookMaster.sln
├── Api/     ASP.NET Core Web API + EF Core, talks to MySQL
├── Mvc/     ASP.NET Core MVC front end, consumes the Api over HTTP
└── Tests/   xUnit test project
```

## Request flow

```
Browser ──HTTP──▶ Mvc (ASP.NET Core MVC)
                     │
                     │  HTTP (ApiBaseUrl)
                     ▼
                   Api (ASP.NET Core Web API + EF Core)
                     │
                     │  MySQL protocol
                     ▼
                  MySQL database
```

The Mvc app holds no direct database access — all reads and writes to
book, listing, exchange, and user data go through the Api. This keeps
data-access and business rules in one place and lets the Api be reused by
other clients later (mobile app, another front end, etc.).

## Domain model (from the project's requirement analysis)

- **User** — registers, authenticates, owns a personal library
- **Book** — a catalog item; a **Library entry** links a User to a Book
  they own
- **Listing** — a Book a User has made available for exchange, with what
  they're looking for in return
- **Exchange Request** — another User offering one of their books against
  a Listing
- **Exchange** — created once a request is accepted; transfers ownership
  and is recorded in exchange history
- **Admin** — manages users, books, categories, and exchange activity
  platform-wide

See `Api/schema.sql` (referenced in the README's Setup section) and
`BM_DB_Design.jpeg` for the concrete schema and entity-relationship diagram.

## Environments

| Environment | Api | Mvc | Database |
|---|---|---|---|
| Local dev | `dotnet run` in `Api/` | `dotnet run` in `Mvc/` | Local MySQL, connection string in `Api/appsettings.Development.json` |
| Docker (see `DEPLOYMENT.md`) | `bookmaster-api` container | `bookmaster-mvc` container | `bookmaster-mysql` container, data in a named volume |

## Planned change

The README notes MySQL is the current database, with a future migration to 
Microsoft SQL Server planned. When that happens, only the Api's EF Core
provider and connection string need to change —- the Mvc app and the
Docker/deployment setup in `DEPLOYMENT.md` are database-agnostic aside from
the `mysql` service itself, which would be swapped for a `mssql` one.
