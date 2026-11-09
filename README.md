# Office Space

A 3D digital office that shows who is working on what. Each person has a named office, each project or approved task is a cubicle, and a check-in machine records time at work.

Status: foundation only. See [docs/PLAN.md](docs/PLAN.md) for the build order.

## Run it locally

Needs Node 24.

```
npm ci
npm run dev
```

Open http://localhost:3000. To use the database locally, copy `.env.example` to `.env.local` and fill it in.

## Checks

```
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`GET /api/health` returns `{"ok":true}` when the app can reach its database.

## Built with AI

This project is built with Claude Code. See [docs/AI-USAGE.md](docs/AI-USAGE.md).
