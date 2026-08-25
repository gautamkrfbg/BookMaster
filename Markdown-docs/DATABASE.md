# BookMaster — Database

BookMaster currently runs on **MySQL**, with Microsoft SQL Server planned
as a future migration target (per `readme.md`).

## Source of truth

- Schema: `Api/schema.sql` — run this against a fresh MySQL database as
  described in the README's Setup step 1.
- Entity-relationship diagram: `BM_DB_Design.jpeg` (repo root).
- Full functional/non-functional requirements:
  `Requirement_Analysis_BookMaster.docx`.

This document summarizes the domain model in prose; for exact column
types, constraints, and indexes, refer to `Api/schema.sql` itself — that's
the file that actually gets run, so it's the definitive source rather than
this write-up.

## Domain model (from the project's requirements and features list)

| Entity | Purpose |
|---|---|
| **User** | Registers and authenticates; owns a personal library |
| **Book** | Catalog item — title/author/etc. metadata |
| **Library entry** | Links a User to a Book they own |
| **Listing** | A Book a User has made available for exchange, plus what they want in return |
| **Exchange Request** | Another User offering one of their own books against a Listing |
| **Exchange** | Created once a request is accepted; transfers ownership and is recorded in history |
| **Wishlist item** | A Book a User wants, independent of any active listing |
| **Rating / Review** | Feedback tied to a completed exchange or user |
| **Category** | Classification used for browsing/filtering books |
| **Admin** | Not a separate table necessarily, but a role with elevated permissions over users, books, categories, and exchange activity |

## Relationships (conceptual)

```
User ──1───N── Library entry ──N───1── Book
User ──1───N── Listing ──1───1── Book
Listing ──1───N── Exchange Request ──N───1── User (requester)
Exchange Request ──1───1── Exchange (once accepted)
User ──1───N── Wishlist item ──N───1── Book
Book ──N───1── Category
```

Verify the exact cardinalities and foreign keys against `BM_DB_Design.jpeg`
and `Api/schema.sql` — this table is a reading aid, not a replacement for
either.

## Applying the schema

**Local:**
```bash
mysql -u <user> -p <database> < Api/schema.sql
```

**Docker:** handled automatically — see [DEPLOYMENT.md](../DEPLOYMENT.md)
§5, which mounts `Api/schema.sql` as a MySQL init script.

## Migrating to SQL Server (future)

When the planned migration happens:
1. Add the `Microsoft.EntityFrameworkCore.SqlServer` package to `Api/`.
2. Update the EF Core provider registration and connection string in
   `Api/appsettings.json`.
3. Regenerate/port the schema (EF Core migrations, or a translated
   `.sql` script) — MySQL-specific types and syntax in the current schema
   will need SQL Server equivalents.
4. Update `DEPLOYMENT.md`'s `mysql` compose service to a `mssql` one if
   using the Docker setup.

No changes are needed in `Mvc/` for this migration — it only talks to the
Api over HTTP.
