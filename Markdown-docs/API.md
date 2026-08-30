# BookMaster — API Reference

This is a **template** for documenting the Api's actual endpoints. I don't
have visibility into `Api/`'s controllers/routes from the repo listing
alone, so nothing below is a confirmed route — fill in each section from
the real controllers before treating this as accurate. Delete this notice
once it's filled in.

## Base URL

- Local: whatever you set in `Api/appsettings.json` (README Setup step 3
  runs it with `dotnet run`'s default Kestrel port unless overridden).
- Docker: `http://localhost:8080` (see [DEPLOYMENT.md](../DEPLOYMENT.md)).

## Conventions to document once known

- [ ] Authentication scheme (cookie, JWT, etc.) and how to obtain a token
- [ ] Standard error response shape
- [ ] Pagination pattern for list endpoints, if any
- [ ] API versioning scheme, if any

## Endpoint groups to fill in

Based on the features listed in `readme.md`, the Api likely exposes
controllers along these lines — replace each with the real route, verb,
request/response shape once confirmed against the source:

### Auth
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user *(placeholder — confirm route)* |
| `POST` | `/api/auth/login` | Authenticate *(placeholder — confirm route)* |

### Books / Library
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/books` | Browse/search/filter books *(placeholder)* |
| `GET` | `/api/library` | Current user's personal library *(placeholder)* |
| `POST` | `/api/library` | Add a book to the user's library *(placeholder)* |

### Listings
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/listings` | Browse active exchange listings *(placeholder)* |
| `POST` | `/api/listings` | Create a listing for a book the user owns *(placeholder)* |

### Exchange requests
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/exchange-requests` | Submit a request against a listing *(placeholder)* |
| `POST` | `/api/exchange-requests/{id}/accept` | Accept a request, triggering ownership transfer *(placeholder)* |
| `POST` | `/api/exchange-requests/{id}/reject` | Reject a request *(placeholder)* |

### Wishlist, ratings, reviews
| Method | Route | Description |
|---|---|---|
| `GET`/`POST` | `/api/wishlist` | Manage a user's wishlist *(placeholder)* |
| `POST` | `/api/reviews` | Leave a rating/review after an exchange *(placeholder)* |

### Admin
| Method | Route | Description |
|---|---|---|
| `GET`/`PUT`/`DELETE` | `/api/admin/users` | Manage users *(placeholder)* |
| `GET`/`PUT`/`DELETE` | `/api/admin/categories` | Manage categories *(placeholder)* |

## How to fill this in accurately

From the repo root:
```bash
grep -rn "\[Route\|\[Http" Api/ --include=*.cs
```
This lists every controller's route attributes and HTTP-verb attributes so
each placeholder above can be replaced with the real path and method.
