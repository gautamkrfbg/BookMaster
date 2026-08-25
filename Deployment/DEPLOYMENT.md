# BookMaster — Docker Deployment Guide

This containerizes exactly the steps already in the repo's `readme.md`
Setup section — nothing renamed, no extra config keys introduced. It does
not modify `readme.md`.

For reference, the steps being containerized are:

1. Create MySQL db, run `Api/schema.sql`.
2. Set connection string in `Api/appsettings.json`.
3. `cd Api && dotnet run`
4. Set `ApiBaseUrl` in `Mvc/appsettings.json`.
5. `cd Mvc && dotnet run`
6. `cd Tests && dotnet test`

> Steps 1, 2, and 4 still need to be done by hand once, exactly as the
> README says, **before** building the images — see below. Docker then
> replaces steps 3 and 5 (`dotnet run`) with containers running the
> published apps. Step 6 (`dotnet test`) isn't part of this deployment; run
> it locally or in CI as before.

## 1. Prerequisites

- Docker Engine 24+ and Docker Compose v2 (`docker compose version`)
- Ports `3306`, `8080`, `8081` free on the host (or edit `docker-compose.yml`)

## 2. Files added by this guide

Place these at the **repository root**, alongside `BookMaster.sln`
(`readme.md` itself is untouched):

```
BookMaster/
├── Api/
│   └── Dockerfile
├── Mvc/
│   └── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── DEPLOYMENT.md
```

## 3. Do the README's config steps first

**Step 2 — Api connection string:** edit `Api/appsettings.json` and point
its connection string at `mysql` as the host (that's the docker-compose
service name, resolvable only *between* containers on the compose network),
port `3306`, and the database/user/password you'll put in `.env` in the
next section. Example shape (adjust to match the key your `Program.cs`
actually reads):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=mysql;Port=3306;Database=<db>;User=<user>;Password=<password>;"
  }
}
```

**Step 4 — Mvc's ApiBaseUrl:** edit `Mvc/appsettings.json` so `ApiBaseUrl`
points at the Api container by service name, not `localhost`:

```json
{
  "ApiBaseUrl": "http://api:8080"
}
```

Both files get baked into their respective images at build time, same as
they would running `dotnet run` locally — Docker isn't overriding them.

## 4. Set the MySQL credentials

```bash
cp .env.example .env
```

Edit `.env` and make the values match what you put in
`Api/appsettings.json`'s connection string above:

```
MYSQL_ROOT_PASSWORD=<strong-password>
MYSQL_DATABASE=<db>
MYSQL_USER=<user>
MYSQL_PASSWORD=<password>
```

Add `.env` to `.gitignore` if it isn't already — never commit real
credentials.

## 5. Build and start the stack

```bash
docker compose up -d --build
```

This will:
1. Start **MySQL 8.4**, creating the database and running `Api/schema.sql`
   against it on first start (MySQL only runs init scripts once, against an
   empty data volume — this replaces doing step 1 by hand).
2. Build and start the **Api** container from `Api/Dockerfile` once MySQL
   reports healthy, listening on `http://localhost:8080`.
3. Build and start the **Mvc** container from `Mvc/Dockerfile`, listening
   on `http://localhost:8081`.

Check status:

```bash
docker compose ps
docker compose logs -f api
```

## 6. Verify

- Api: hit a known Api route at `http://localhost:8080`.
- Mvc: open `http://localhost:8081` in a browser.
- MySQL: `docker compose exec mysql mysql -u <user> -p <db>`

## 7. Running the tests (step 6)

Not part of the running stack — run as the README describes, locally or
in CI:

```bash
cd Tests && dotnet test
```

## 8. Updating / redeploying

```bash
git pull
docker compose up -d --build
```

The `mysql-data` volume persists across redeploys, so data isn't lost. If
you change `Api/appsettings.json` or `Mvc/appsettings.json`, the rebuild
picks up the new values automatically.

## 9. Stopping / cleaning up

```bash
docker compose down          # stop containers, keep the data volume
docker compose down -v       # stop containers AND delete the MySQL data volume
```

## 10. Production hardening checklist

- [ ] Put the Api and Mvc behind a reverse proxy (Nginx/Traefik/Caddy) that
      terminates TLS — don't expose ports 8080/8081 directly to the internet.
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production` via `Api/appsettings.Production.json`
      and `Mvc/appsettings.Production.json` (or an env var), so detailed
      error pages are disabled.
- [ ] Keep real credentials in `.env`/a secret manager, never in
      `appsettings.json` as committed to git.
- [ ] Restrict MySQL's `3306` port to internal networking only in
      production (drop the `ports:` mapping on the `mysql` service; keep it
      only for local debugging).
- [ ] Back up the `mysql-data` volume on a schedule (`mysqldump` via a cron
      job or a dedicated backup container).

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `api` keeps restarting | MySQL not ready yet, or the connection string in `Api/appsettings.json` doesn't match `.env` | Check `docker compose logs mysql`; confirm the host/user/password/db all match |
| Mvc can't reach Api | `ApiBaseUrl` in `Mvc/appsettings.json` still says `localhost` | It must be `http://api:8080` — container-to-container traffic uses the compose service name, not `localhost` |
| `Access denied for user` on MySQL | `.env` password doesn't match what's already baked into the existing data volume | `docker compose down -v` to wipe the volume and reseed with the current `.env`/`appsettings.json` values |
| `Api/schema.sql` didn't run | MySQL data volume already existed from a prior run | Init scripts only run against an empty data directory — `docker compose down -v` first if you need a fresh seed |
