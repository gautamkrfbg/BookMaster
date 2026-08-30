# BookMaster — Testing

Tests live in `Tests/` (xUnit), per `readme.md`.

## Running the tests

```bash
cd Tests
dotnet test
```

Or from the repo root, targeting just that project:

```bash
dotnet test Tests
```

Or the whole solution (builds `Api` and `Mvc` too, then runs tests):

```bash
dotnet test BookMaster.sln
```

## Useful flags

```bash
# Verbose output — see each test name as it runs
dotnet test --logger "console;verbosity=detailed"

# Run only tests matching a name filter
dotnet test --filter "FullyQualifiedName~ExchangeRequest"

# Generate a code coverage report (requires coverlet.collector,
# add via: dotnet add Tests package coverlet.collector)
dotnet test --collect:"XPlat Code Coverage"
```

## What to test

Given the domain (see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) and
[docs/DATABASE.md](./DATABASE.md)), the areas most worth covering:

- **Exchange lifecycle** — request → accept/reject → ownership transfer →
  history record. This is the core business rule of the app and the
  easiest place for a bug to cause data inconsistency.
- **Ownership/authorization** — a user shouldn't be able to accept a
  request on someone else's listing, edit another user's library, etc.
- **Validation** — listing a book you don't own, requesting an exchange
  with a book you don't own, duplicate/conflicting requests on the same
  listing.
- **Admin operations** — user/book/category management paths, since
  they bypass normal user-facing constraints.

## Running tests in CI

If you set up the GitHub Actions workflow in
[DEPLOYMENT.md](../DEPLOYMENT.md) §11 (or `.github/workflows/`), add a test
job so PRs don't merge with a broken build:

```yaml
name: build-and-test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - run: dotnet restore BookMaster.sln
      - run: dotnet build BookMaster.sln --no-restore
      - run: dotnet test BookMaster.sln --no-build
```

Note this workflow doesn't spin up a MySQL instance, so any tests that hit
a real database won't run here — either add a `mysql` service container to
the job, or keep those as integration tests run separately from the main
unit-test suite.
