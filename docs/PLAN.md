# Plan: Digital Office Space web app

## Context

The owner wants a web app that shows who is working on what, presented as a walkable 3D office seen from an angled top-down camera. Each user has a named office. Each office holds cubicles for that person's projects and approved tasks. Anyone checked in can look inside a cubicle, and an occupied cubicle is obvious at a glance. A check-in machine is the only way in and out, and it produces each user's time log.

The project folder is empty, so this is a new build. Node 24, git and GitHub CLI (account `SAKMAL08-maker`) are ready. Vercel CLI runs through `npx`.

## Status

| PR  | Name          | Status      |
| --- | ------------- | ----------- |
| 0   | Foundation    | Done        |
| 1   | Accounts      | In review   |
| 2   | Attendance    | Not started |
| 3   | Work items    | Not started |
| 4   | 3D world      | Not started |
| 5   | Cubicles live | Not started |
| 6   | Backblaze     | Not started |
| 7   | Hardening     | Not started |

## Owner decisions so far

| Topic     | Decision                                                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts  | Invite only, email + password                                                                                                            |
| Movement  | Click to walk; other workers update every few seconds                                                                                    |
| Backblaze | Task/project attachments, profile pictures, time log exports                                                                             |
| Cubicles  | One per project the user created, one per task assigned to them                                                                          |
| Assigning | Anyone can assign any number of tasks to anyone. **The assignee must approve before a cubicle appears.** Declined tasks never create one |

## Stack

- **Next.js + TypeScript** on Vercel (pages and server code in one project).
- **React Three Fiber** (React wrapper for Three.js, the browser 3D library) with a fixed angled camera. Scenery is original low-poly shapes built in code, so there are no model files or licensing issues.
- **Neon Postgres**, added through the Vercel integration, with **Drizzle** for typed queries and dated migration files.
- **Better Auth** for passwords and login sessions, with public sign-up switched off except through a valid invite.
- **Backblaze B2** private bucket. Browsers upload directly using short-lived signed links, because Vercel caps request bodies at about 4.5 MB.
- **Vitest** for logic tests, **Playwright** for browser tests, **GitHub Actions** for CI.

## How it works

**The journey**

1. Log in, and you land in the lobby. Only the check-in machine works.
2. Click the machine: your character walks over and checks in. An attendance record opens and the office floor unlocks.
3. The floor is a grid of offices with name plates. Click a door to enter. Click a cubicle to walk there and open its details panel.
4. In your own office, press **Start working here**. Your character sits down and the time starts counting against that project or task. Starting elsewhere ends the previous one automatically.
5. To leave, walk to the machine and check out. This closes the work and attendance records. Log out is only offered after checking out.

**Occupied cubicle indicator:** character seated, screen lit, coloured glow on the cubicle, floating label with name and project. The office door also shows a "working" badge, so you can spot it from the floor view.

**Task approval**

- Assigned task → status `pending` → appears in the assignee's inbox (HUD badge plus an in-tray object in their office).
- Approve → the status change and new cubicle are saved together in one database transaction. Decline → no cubicle, and the assigner sees the decline with an optional reason.
- Tasks you assign to yourself are approved automatically. The assigner can cancel while still pending.
- A task in a project the assignee already owns sits inside that project's cubicle rather than adding a second one.

**Data tables**
`users`, auth tables, `invites`, `projects`, `tasks` (with `approval_status`), `cubicles` (owner, project or task, fixed seat number), `attendance_sessions`, `work_sessions`, `attachments`, `time_exports`.

Database rules enforce the key facts: one open attendance per user, one open work session per user, one cubicle per project or task.

**Security rule:** the check-in gate lives on the server (`requireCheckedIn()`, used by every office API). Hiding buttons alone wouldn't stop anyone.

**Live updates:** each open, visible tab asks `/api/presence` every 10 seconds, and that same call acts as the "still here" signal. Your own actions show instantly.

**Backblaze rules:** private bucket, signed links that expire, keys only in Vercel env vars. Limits: 25 MB per attachment, 2 MB per picture. Pictures are PNG, JPEG or WebP only (no SVG, which can carry scripts). Attachments always download rather than open in the page.

## Project layout

```
src/app/            pages and API routes
src/world/          3D scenes (Lobby, Floor, OfficeRoom, Cubicle, Worker, CheckInMachine)
src/ui/             2D panels, inbox, time log, forms
src/server/         attendance, tasks, cubicles, storage, auth rules
src/db/             schema + migrations/
tests/              unit and browser tests
docs/               PLAN, HANDOFF, decisions, AI usage, ai-logs/SESSION-LOG
```

Files stay small and each 3D object is its own component.

## Build order (one PR each)

| #   | PR            | Outcome                                                                                                                   |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0   | Foundation    | Private GitHub repo `office-space`, `.gitignore`, project `CLAUDE.md`, docs, CI, blank app live on Vercel, Neon connected |
| 1   | Accounts      | Schema, login, invite links, first admin account, password reset by admin link                                            |
| 2   | Attendance    | Check-in/out rules, server gate, time log page                                                                            |
| 3   | Work items    | Projects, tasks, approval inbox, cubicle creation (plain 2D screens)                                                      |
| 4   | 3D world      | Lobby, machine, floor, offices, click-to-walk, camera moves                                                               |
| 5   | Cubicles live | Details panel, start working, indicators, presence, "who's working" list                                                  |
| 6   | Backblaze     | Attachments, profile pictures, CSV exports                                                                                |
| 7   | Hardening     | Login rate limits, phone layout, security review, full browser test run                                                   |

Logic comes before 3D on purpose: the rules get tested first, and the scene only displays them.

## What I need from you (at the right step)

- Run `! npx vercel login` and add the Neon integration in the Vercel dashboard.
- Create the Backblaze bucket and app key, then **type them into Vercel yourself, never the chat**.
- Your own words for the "why" in `docs/decisions.md` and the plan. I'll ask rather than write them for you.

## Defaults I chose (say if you want any changed)

1. **Forgot to check out / closed the tab:** after 2 minutes of silence the character shows "away". After 2 hours of silence the record closes automatically, ends at the last signal so hours aren't inflated, and is marked "auto-closed".
2. **Time log visibility:** you see your own; admins see everyone's and can export them.
3. **Finished work:** marking a task done or archiving a project removes its cubicle. History stays in the time log.
4. **Who can start work:** only the cubicle's owner. Everyone else can look only.
5. **Repo:** private, named `office-space`.
6. **Added by me:** a plain "who's working on what" list, for phones, keyboard users and devices that can't run 3D.

## Critique: gaps, risks, simpler options

- **Hosting limits (checked 2026-11-10).** Vercel's free Hobby plan excludes commercial use, so a real company team needs Pro. Hobby includes 1M function calls a month; 10 people, 8 hours, 10-second checks is about 630k. Neon Free gives 100 CU-hours a month, about 400 hours at the smallest size, and polling keeps it awake for about 176 work hours. The interval is one setting.
- **Walking to the machine can't be proven.** The server enforces being checked in, but the walk itself happens in the browser. A determined user could call the check-out API directly. That's fine for a team tool, but not for payroll-grade records.
- **No email service.** Invites and password resets are links an admin copies and sends. This avoids another account and can be added later.
- **3D on phones and weak laptops.** Low-poly scenes and repeated shapes keep it light. Very large offices will scroll within the room, and the list view is the fallback.
- **Simpler option considered:** a flat isometric 2D drawing would be cheaper, but you asked for 3D, so real 3D stays.

## Verification

- **Each PR:** lint, format check, unit tests and build all pass in CI against a real Postgres database.
- **Unit tests:** double check-in blocked, gate refuses unchecked-in users, approve creates exactly one cubicle, decline creates none, switching cubicles closes the earlier session, auto-close uses the last signal.
- **Browser tests:** two users. A checks in, assigns a task to B, B approves, the cubicle appears, B starts work, A sees the indicator within one update, B checks out, and the time log shows correct durations.
- **Backblaze:** real upload and download on a preview deployment, and confirm an expired link fails.
- **By eye:** render the 3D scenes at desktop and phone widths and look at them before calling any UI PR done.
- Each report will say plainly what was tested, what used mock data and what wasn't verified.
