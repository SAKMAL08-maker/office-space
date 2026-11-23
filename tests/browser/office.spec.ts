import { expect, test } from "@playwright/test";
import { createFirstAdmin, emptyDatabase, greeting, logIn, openMenuOnPhone } from "./helpers";

// Software graphics can freeze the page for half a minute or more while the office is first
// drawn after check-in, so each walk to a machine gets plenty of time.
const WALK = { timeout: 150_000 };

test.beforeEach(async () => {
  await emptyDatabase();
});

test("log in, check in, walk to the check-out machine and check out", async ({
  page,
  isMobile,
}) => {
  await createFirstAdmin(page);
  await logIn(page);

  // The person can only walk once the 3D office is drawn.
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

  // The button walks the person to the machine, and the machine checks them in on arrival.
  await page.getByRole("button", { name: /check-in machine/i }).click();
  await openMenuOnPhone(page, isMobile);
  await expect(greeting(page, /You checked in on/)).toBeVisible(WALK);
  // Log out is only offered after checking out.
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);

  // Checking out only happens on arrival, so this also proves the walk across the lobby.
  await page.getByRole("button", { name: /check-out machine/i }).click();
  await expect(greeting(page, "You are checked out.")).toBeVisible(WALK);
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  // The server agrees: a fresh page load still shows the person checked out.
  await page.reload({ waitUntil: "commit" });
  await openMenuOnPhone(page, isMobile);
  await expect(greeting(page, "You are checked out.")).toBeVisible();
});
