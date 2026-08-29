# BookMaster

BookMaster is a digital book ownership and peer-to-peer exchange platform. It allows users to manage their personal library, list owned books for exchange, discover available listings, and exchange books with other users.

## Features

- User registration and authentication (JWT)
- Roles: `USER` and `ADMIN`
- Personal digital book library
- Book search, browsing, and filtering
- Exchange listings and exchange requests
- Accept or reject exchange requests (owner-only)
- Ownership transfer after successful exchanges
- Exchange history and notifications
- Admin dashboard and administrative management of books, categories, listings, and activity

## Tech Stack

.NET 8 solution:
- **Api** (ASP.NET Core Web API + EF Core + SQL Server + JWT auth)
- **Mvc** (ASP.NET Core MVC, consumes the Api)
- **Tests** (xUnit + EF Core InMemory)

## Requirements

- .NET 8 SDK
- SQL Server (local instance acceptable)

## Setup

### 1. Configure the database connection

The API reads the connection string from `ConnectionStrings__DefaultConnection` (environment variable) or from .NET user secrets. Set it for the `Api` project:

```bash
cd Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=bookmaster;User Id=sa;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
```

> Never commit real credentials. The checked-in `Api/appsettings.json` intentionally has an empty connection string.

### 2. Create the database schema

The schema is managed with EF Core migrations (`Api/Migrations`).

- **Automatic:** running the API from the `BookMaster.Api` launch profile applies pending migrations and seeds the default admin on startup.
- **Manual:** run `dotnet ef database update --project Api`.

### 3. Run the API

```bash
cd Api
dotnet run
```

The API runs on `https://localhost:59692/api` (see `Api/Properties/launchSettings.json`). Swagger is available at `https://localhost:59692/swagger` in Development.

On first start (launch profile used), the database is migrated and the default admin is created:

- Email: `admin@bookmaster.local`
- Password: `Admin@123`

Change these before any real deployment via `Admin:Email` and `Admin:Password` configuration keys (or the `Admin__Email` / `Admin__Password` environment variables).

### 4. Run the web app

```bash
cd Mvc
dotnet run
```

The MVC app runs on `https://localhost:59691`. Its `ApiBaseUrl` is configured in `Mvc/appsettings.json` and must match the running API.

### 5. Using the app

- Register a normal account (`/Auth/Register`) or sign in with the admin credentials.
- Regular users create books and listings, and send exchange requests.
- Only the listing owner can accept/reject a request. After acceptance, ownership of both books is transferred and the exchange is recorded in history.
- Admins can delete categories, books, listings, and users, and view the dashboard at `/Admin`.

### 6. Run the tests

```bash
cd Tests
dotnet test
```

## API Overview

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create a user account |
| POST | `/api/auth/login` | public | Obtain a JWT |
| GET | `/api/users` | public | List users |
| GET | `/api/users/{id}` | public | User details |
| GET | `/api/users/{id}/library` | public | User's books |
| GET | `/api/users/{id}/exchange-history` | public | User's exchange history |
| PUT | `/api/users/{id}` | any user | Update profile |
| DELETE | `/api/users/{id}` | admin | Delete user |
| GET | `/api/books` | public | List/search books |
| POST | `/api/books` | any user | Add a book (current user becomes owner) |
| PUT/DELETE | `/api/books/{id}` | admin | Update/delete book |
| GET/POST | `/api/categories` | public / admin | List / create categories |
| GET | `/api/exchangelistings` | public | List listings |
| POST | `/api/exchangelistings` | any user | Create a listing (owns the book) |
| DELETE | `/api/exchangelistings/{id}` | admin | Delete listing |
| POST | `/api/exchangerequests` | any user | Request an exchange |
| POST | `/api/exchangerequests/{id}/accept` | listing owner | Accept a request |
| POST | `/api/exchangerequests/{id}/reject` | listing owner | Reject a request |
| GET | `/api/admin/stats` | admin | Platform statistics |

Protected endpoints require an `Authorization: Bearer <token>` header. Security notes:

- Passwords are hashed with PBKDF2 (150k iterations, per-password salt).
- The JWT signing key comes from `Jwt:Key` — override it in production (e.g. `Jwt__Key`).
- CORS only allows the configured MVC origin.

## Roles

- **USER:** manages their own books, creates listings, participates in exchanges.
- **ADMIN:** manages users, books, categories, listings, and views platform activity.

## Core Flow

1. A user registers and adds books to their personal library.
2. The user lists a book for exchange and specifies what they are looking for.
3. Other users browse listings and submit exchange requests with an offered book.
4. The listing owner accepts or rejects a request.
5. After acceptance, ownership is transferred and the exchange is recorded.

## Database Design

The current database is **SQL Server**, managed through EF Core migrations under `Api/Migrations`.

## Developers

- IN26015092	Akshat Jaiswal
- IN26013135	Prathvi Raj Singh Rathod
- IN26013590	Aanis Ali Shah
- IN26014327	Ayush Singh
- IN26014815	Gautam Kumar
- IN26014395	Anuj rai