# Plan: Digital Office Space web app

## Context

The owner wants a web app that shows who is working on what, presented as a walkable 3D office seen from an angled top-down camera. Each user has a named office. Each office holds one cubicle for each of that person's active projects. Anyone checked in can look inside a cubicle, and an occupied cubicle is obvious at a glance. A check-in machine and a check-out machine are the only way in and out, and they produce each user's time log.

The project folder is empty, so this is a new build. Node 24, git and GitHub CLI (account `SAKMAL08-maker`) are ready. Vercel CLI runs through `npx`.

## Status

| PR  | Name       | Status      |
| --- | ---------- | ----------- |
| 0   | Foundation | Done        |
| 1   | Accounts   | Done        |
| 2   | Attendance | Done        |
| 3   | Work items | Done        |
| 4   | 3D world   | Done        |
| 5a  | Working    | Done        |
| 5b  | Presence   | In review   |
| 6   | Backblaze  | Not started |
| 7   | Hardening  | Not started |

## Owner decisions so far

| Topic     | Decision                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts  | Invite only, email + password                                                                                                                                                                                                                     |
| Movement  | Click to walk; other workers update every few seconds                                                                                                                                                                                             |
| Backblaze | Task/project attachments, profile pictures, time log exports                                                                                                                                                                                      |
| Cubicles  | One per active project, whether the user created it or accepted it as a task                                                                                                                                                                      |
| Tasks     | A task is a project offered to someone. Anyone can send one to anyone else. **It only becomes a project, with a cubicle, if the receiver accepts it.** Rejected tasks never create one. At most 10 can be waiting from one sender to one receiver |

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
2. Click the check-in machine: your character walks over and checks in. An attendance record opens and the office floor unlocks.
3. The floor is a grid of offices with name plates. Click a door to enter. Click a cubicle to walk there and open its details panel.
4. In your own office, press **Start working here**. Your character sits down and the time starts counting against that project. Starting elsewhere ends the previous one automatically.
5. To leave, walk to the check-out machine and check out. This closes the work and attendance records. Log out is only offered after checking out. Using the check-in machine while still checked in asks "You are still not checked out, would you like to?" with Yes and No. Yes logs the check-out time. No leaves the record open.

**Occupied cubicle indicator:** character seated, screen lit, coloured glow on the cubicle, floating label with name and project. The office door also shows a "working" badge, so you can spot it from the floor view.

**Tasks and projects**

A task is a project offered to someone. It is called a task until the receiver accepts it, and then it becomes their project.

- Sent task → status `pending` → appears in the receiver's inbox (a count on the home page, later a HUD badge plus an in-tray object in their office). At most 10 can be waiting from one sender to one receiver.
- Accept → the status change, the new project and its cubicle are saved together in one database transaction. Reject → nothing is created, and the sender sees the rejection with an optional reason.
- The sender can cancel while the task is waiting. After acceptance the project belongs to the receiver, and the sender is only credited ("sent by").
- You cannot send a task to yourself. To work on something yourself, create a project.
- A project's owner can edit its title and description while it is active. The task record keeps the original wording.
- Finish removes the cubicle and keeps the project. Reopen gives it the owner's lowest free seat.

**Data tables**
`users`, auth tables, `invites`, `tasks` (with `status`), `projects`, `cubicles` (owner, project, seat number), `attendance_sessions`, `work_sessions`, `presence` (each person's last cell and last-seen time), `attachments`, `time_exports`.

Database rules enforce the key facts: one open attendance per user, one open work session per user, one cubicle per project, one project per task, no seat shared within an office.

**Security rule:** the check-in gate lives on the server (`requireCheckedIn()`, used by every office API). Hiding buttons alone wouldn't stop anyone.

**Live updates:** each open, visible tab asks `/api/presence` every 10 seconds, and that same call acts as the "still here" signal. Your own actions show instantly.

**Backblaze rules:** private bucket, signed links that expire, keys only in Vercel env vars. Limits: 25 MB per attachment, 2 MB per picture. Pictures are PNG, JPEG or WebP only (no SVG, which can carry scripts). Attachments always download rather than open in the page.

## Project layout

```
src/app/            pages and API routes
src/world/          3D scenes (Lobby, Floor, OfficeRoom, Cubicle, Worker, CheckInMachine, CheckOutMachine)
src/ui/             2D panels, inbox, time log, forms
src/server/         attendance, tasks, cubicles, storage, auth rules
src/db/             schema + migrations/
tests/              unit and browser tests
docs/               PLAN, HANDOFF, decisions, AI usage, ai-logs/SESSION-LOG
```

Files stay small and each 3D object is its own component.

## Build order (one PR each)

| #   | PR         | Outcome                                                                                                                   |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0   | Foundation | Private GitHub repo `office-space`, `.gitignore`, project `CLAUDE.md`, docs, CI, blank app live on Vercel, Neon connected |
| 1   | Accounts   | Schema, login, invite links, first admin account, password reset by admin link                                            |
| 2   | Attendance | Check-in/out rules, server gate, time log page                                                                            |
| 3   | Work items | Projects, tasks, approval inbox, cubicle creation (plain 2D screens)                                                      |
| 4   | 3D world   | Lobby, machines, floor, offices, click-to-walk, camera moves                                                              |
| 5a  | Working    | Details panel, start and stop working, occupied indicators, nicer character and furniture, work periods in the time log   |
| 5b  | Presence   | Other people's characters, updates every 10 seconds, away after 2 minutes, "who's working" list                           |
| 6   | Backblaze  | Attachments, profile pictures, CSV exports                                                                                |
| 7   | Hardening  | Login rate limits, protection against traffic floods, phone layout, security review, full browser test run                |

Logic comes before 3D on purpose: the rules get tested first, and the scene only displays them.

## What I need from you (at the right step)

- Run `! npx vercel login` and add the Neon integration in the Vercel dashboard.
- Create the Backblaze bucket and app key, then **type them into Vercel yourself, never the chat**.
- Your own words for the "why" in `docs/decisions.md` and the plan. I'll ask rather than write them for you.

## Defaults I chose (say if you want any changed)

1. **Forgot to check out / closed the tab:** after 2 minutes of silence the character shows "away". Attendance keeps running until the person checks out (owner's change, replacing an automatic close after 2 hours). The check-in machine reminds them, as in step 5 of the journey.
2. **Time log visibility:** you see your own; admins see everyone's and can export them.
3. **Finished work:** finishing a project removes its cubicle, and the owner can reopen it (owner's change). History stays in the time log.
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
- **Unit tests:** double check-in blocked, gate refuses unchecked-in users, accept creates exactly one project and cubicle, reject creates none, switching cubicles closes the earlier session, attendance stays open until the person checks out.
- **Browser tests:** two users. A checks in, sends a task to B, B accepts, the cubicle appears, B starts work, A sees the indicator within one update, B checks out, and the time log shows correct durations.
- **Backblaze:** real upload and download on a preview deployment, and confirm an expired link fails.
- **By eye:** render the 3D scenes at desktop and phone widths and look at them before calling any UI PR done.
- Each report will say plainly what was tested, what used mock data and what wasn't verified.
