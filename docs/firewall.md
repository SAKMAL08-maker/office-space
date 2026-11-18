# Firewall: flood protection (PR 7b)

The app's flood protection is one Vercel Firewall rule. It lives in the Vercel dashboard, not in the code, so this page is the record of what it should be. If the dashboard and this page disagree, one of them is wrong: fix it.

## The rule

| Setting   | Value                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------ |
| Name      | Logged-out pages                                                                                 |
| If        | Request Path starts with `/login`, `/setup`, `/invite`, `/reset` or `/api/auth` (joined with OR) |
| Then      | Rate Limit                                                                                       |
| Algorithm | Fixed Window                                                                                     |
| Window    | 60 seconds                                                                                       |
| Limit     | 60 requests                                                                                      |
| Key       | IP Address                                                                                       |
| Action    | Too Many Requests (429)                                                                          |

## Why it is shaped this way

- **Only the logged-out pages.** These are the only pages a stranger can use. Everything else needs a login, and `/api/presence` (one call per open tab every 10 seconds) is never matched, so nobody working is ever blocked. The app calls `/api/auth` only to log in and log out, never in the background.
- **60 a minute per address.** The forms already refuse a 6th try in a minute (PR 7a, `src/server/rate-limit.ts` and the login limiter in `src/server/auth.ts`). A real person uses about 2 requests per try (open the page, send the form), so honest use stays far below 60, even for an office sharing one address. People therefore see the app's own "Too many tries" message long before the Firewall's plain 429 page.
- **What it adds to 7a.** 7a's limits run inside the app, so every refused try still runs a function and writes to the database. The Firewall turns a flood away before it reaches the app, which protects the free plan's function time and Neon hours.
- **429, not Challenge.** Login and logout are sent by the page's own code, which cannot show a browser challenge, so they would just fail.

## Limits of the free plan

- One rate-limit rule per project (out of 3 custom rules). This rule is it. A second limited area would need the paid plan, or a limit in code.
- Windows of 10 seconds to 10 minutes, counted by IP address or JA4 digest, Fixed Window only.
- 1,000,000 allowed requests included. With only these paths matched, the app should stay far below that. What happens past it on the free plan is not documented on the rate-limiting page; read the "Rate Limiting Pricing" box the dashboard shows.
- Counts are kept per Vercel region, so traffic arriving through several regions can go somewhat over 60 in total.

## Not covered

Pages that need a login are not rate limited. A stranger calling them is refused, but each refusal still costs one session lookup in the database. Vercel blocks very large attacks automatically on every plan. Revisit in the 7e security review.

## Turning it on (dashboard)

1. Open https://vercel.com/dashboard, pick the **office-space** project, then **Firewall** in the sidebar.
2. Select **⋯** > **Configure** at the top right, then **Add New...** > **Rule**.
3. Name: `Logged-out pages`.
4. Under **If**, add the first condition: **Request Path**, **Starts with**, `/login`.
5. Add four more conditions, choosing **OR** for each one: Request Path starts with `/setup`, then `/invite`, then `/reset`, then `/api/auth`. Check that each joiner reads **OR**, not AND.
6. Under **Then**, choose **Rate Limit**. The first time, a **Rate Limiting Pricing** box appears: read it, then **Continue**.
7. Choose **Fixed Window**. Time Window: `60s`. Request Limit: `60`. Key: **IP Address** only.
8. Leave the action as **Too Many Requests (429)**. Don't add a persistent action.
9. **Save Rule**, then **Review Changes** at the top right, check it lists one new rule, then **Publish**. No redeploy is needed.

## Checking it

From one computer, request `/login` 61 times within a minute: the first 60 get 200 and the 61st gets 429. That computer's address cannot open the login page for up to a minute afterwards. `/api/health` and a logged-in office must keep working throughout.

## When pages change

**Any new page or route usable without logging in must be added to this rule** (and must call `takeFormTry()` if it has a form). If a path is renamed, update the rule and this page in the same PR.
