# Office Space

A 3D digital office that shows who is working on what. Each person has a named office, each project or approved task is a cubicle, and a check-in machine records time at work.

Status: accounts are built (login, invites, password reset links). See [docs/PLAN.md](docs/PLAN.md) for the build order.

## Run it locally

Needs Node 24.

```
npm ci
npm run dev
```

Open http://localhost:3000. To use the database locally, copy `.env.example` to `.env.local` and fill it in, then run `npm run db:migrate`.

Accounts are invite only. The first admin is created at `/setup` using `SETUP_TOKEN`. That page locks once an admin exists. After that, admins invite people and make password reset links at `/admin/people`.

## Checks

```
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

The account tests empty every table, so they run only when the database name ends in `_test`.

`GET /api/health` returns `{"ok":true}` when the app can reach its database.

## Built with AI

This project is built with Claude Code. See [docs/AI-USAGE.md](docs/AI-USAGE.md).
