# Handoff — 2026-11-23

## Where things stand

PRs 0 to 7b, the 7b wrap-up (#31, merge `ba259ed`) and **PR 7c Phone layout** (#32, merge `d7c518d`) are merged; the app is at https://office-space-tawny.vercel.app. Vercel reported the `d7c518d` deploy complete and CI passed on `main`.

New in 7c: on a phone (under 640 px) the office menu is two rows, the title with a Menu button, then "Check-in machine" and "Check-out machine". Everything else, the greeting included, is behind Menu. Desktop is unchanged. Taps on the scene never scroll or zoom the page (`touch-none`). The hint says Tap or Click to match the device's main pointer. Each machine has an unseen tap box (1.6 m wide) a little bigger than its cabinet, in `src/world/machine-body.tsx`. Inside an office on a phone the camera looks 1 m ahead instead of 3 m (`src/world/camera-rig.tsx`). The cubicle panel is capped at 45% of the screen.

From 7b: one Vercel Firewall rule limits the logged-out pages to 60 requests a minute per IP (`docs/firewall.md`). From 7a: 5 tries a minute per IP at login, setup, invite and reset, in the `rate_limits` table.

## In progress

- This wrap-up: branch `docs/wrap-up-phone-layout` (handoff, plan status, session log), as its own small docs PR.
- Merged branches are kept on GitHub (deleting them is still open).

## Next steps

1. Owner: try the live office on a real phone. Tap the floor, a machine, an office door and a desk.
2. **PR 7d browser tests:** Playwright in the repo and in CI on every PR, with a first test: log in, check in, walk, check out (see `docs/PLAN.md`). Then 7e security review (include logged-in routes having no Firewall limit). One session each.
3. Owner: confirm the 7a live limit is per address: 6 wrong logins from phone data, then a normal login from the laptop on Wi-Fi should still work.
4. Still open from before: open the CSV in Excel or Google Sheets; a live picture upload; the live 5c look, the gate swing, an office with 6+ projects.

## Open decisions (owner)

- Confirm or change Claude's PR 7c, 7a, 6c and 6b choices in `docs/decisions.md`. 7c: the greeting behind Menu on phones, Tap/Click hint, bigger machine tap box (it also applies on desktop), the phone room camera, no `viewport-fit=cover`.
- One-line reasons for `docs/decisions.md`: PR 7's four choices, the 7b choices, the PR 6 choices, polish before PR 6, floors that refresh by themselves, the faded grey away look.
- Reflection lines in `docs/ai-logs/SESSION-LOG.md` for PR 5a, 5c, the cubicle-row fix, 6a, 6b, 6c, 7a, 7b and 7c.
- Whether the first 7a commit message (wrong claim about preview builds) stays; Claude advises leaving it rather than rewriting `main`.
- Whether the bucket's Lifecycle is "Keep only the last version"; whether to delete merged branches; check-out confirmation; admins correcting a logged time; work periods in Everyone's time log or the CSV.

## Verified vs. not

- Tested (7c, local): lint, format check, typecheck; 188 tests on a local Postgres; CI on #32 and on `main`. Every page rendered at 375 px (touch, phone mode) and 1280 px with one admin and one project: no page scrolls sideways. In Chrome's simulated touch screen: a floor tap walked; a tap just outside the check-in machine walked there and asked "still not checked out"; a desk tap walked to the chair and opened the cubicle panel.
- Not verified: a real phone (iPhone Safari, Android Chrome); many offices or long names at phone width; landscape. From 7b: `/api/auth` and `/reset` under a live burst; why a burst got 403 and refused the whole site. From 7a: the live limit keyed per address; setup, invite and reset refusing a 6th try in a browser. Older: the CSV in a spreadsheet, a live picture upload, many people at once, invite and reset links live.

## Watch out for

- **Local renders:** in the scratchpad, `npm install embedded-postgres playwright-core` (an install-scripts warning is harmless). Start Postgres on port 54339, database `office_test`, then run `next dev -p 3001` with `DATABASE_URL`, `BETTER_AUTH_URL=http://localhost:3001`, and made-up local `BETTER_AUTH_SECRET` and `SETUP_TOKEN` (24+ characters). Drive the system Chrome with `--use-angle=swiftshader`. The 3D home page never fires "load": wait for `commit`. Allow 15 s for the camera to settle before aiming a tap, and about 14 s for a walk to a machine.
- **The full test suite takes about 6 minutes** locally; run it in the background.
- **A Firewall burst test blocks the testing computer from the whole site for a few minutes.** Never run it from a computer someone is working on.
- **Vercel connection:** reading team settings needs the owner to approve an `authorize_team_access` link (team `jmvl1`, project `prj_ORM0HzS8dJVLOsWwozqHkJLgf8a6`). Changing the Firewall needs the owner's yes.
- **Chained checks:** `npm run format:check | tail` hides a failure; check the exit code.
- **Production migrations run from the PR branch:** `gh workflow run migrate.yml --ref <PR branch>`, before merging.
- **Logins in tests and local runs are limited too** (5 a minute).
- **Backblaze:** `.env.local` holds only the four `B2_` settings; Claude never reads it. Never run `vercel env pull`. Secrets never go in the chat.
- **Stacked PRs:** when two PRs both change `docs/HANDOFF.md`, build the second on the first's branch and merge in order. `gh api .../compare/main...<branch>` shows the true diff.
- Working copies use Windows line endings. `gh pr create` needs `--body-file`. Vercel reports deploys as commit statuses (context `Vercel`).
