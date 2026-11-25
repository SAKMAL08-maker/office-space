import { type BrowserContext, expect, test } from "@playwright/test";
import { createFirstAdmin, emptyDatabase, logIn } from "./helpers";

// One screen size is enough: the People page is the same list on every screen.
test.skip(({ isMobile }) => isMobile, "The People page has no phone layout of its own.");

/** Mo's own browser. Closed after the test even if it fails, or its 3D page slows later tests. */
let moBrowser: BrowserContext | undefined;

test.beforeEach(async () => {
  await emptyDatabase();
});

test.afterEach(async () => {
  await moBrowser?.close();
  moBrowser = undefined;
});

const MEMBER = { name: "Mo Member", email: "mo@example.test", password: "another long password" };

test("an admin disables someone, who can no longer log in, then enables them", async ({
  page,
  browser,
}) => {
  await createFirstAdmin(page);
  await logIn(page);

  // Invite Mo, and have Mo join in a separate browser.
  await page.goto("/admin/people");
  await page.getByRole("textbox", { name: "Email" }).fill(MEMBER.email);
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = await page.getByRole("textbox", { name: "Link to send" }).inputValue();

  moBrowser = await browser.newContext();
  const mo = await moBrowser.newPage();
  await mo.goto(link);
  await mo.getByLabel("Your name").fill(MEMBER.name);
  await mo.getByLabel(/^Choose a password/).fill(MEMBER.password);
  await mo.getByRole("button", { name: "Create my account" }).click();
  await expect(mo).toHaveURL(/\/login$/);

  // The admin's own row has no Disable button; Mo's asks first, and Cancel changes nothing.
  await page.reload();
  const disable = page.getByRole("button", { name: "Disable account" });
  await expect(disable).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.dismiss());
  await disable.click();
  await expect(page.getByText(`${MEMBER.email}, member`, { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await disable.click();
  await expect(page.getByText(`${MEMBER.email}, member, disabled`)).toBeVisible();

  const tryLogIn = async () => {
    await mo.goto("/login");
    await mo.getByRole("textbox", { name: "Email" }).fill(MEMBER.email);
    await mo.getByRole("textbox", { name: "Password" }).fill(MEMBER.password);
    await mo.getByRole("button", { name: "Log in" }).click();
  };
  await tryLogIn();
  await expect(mo.getByText("This account is disabled. Ask an admin to enable it.")).toBeVisible();

  await page.getByRole("button", { name: "Enable account" }).click();
  await expect(page.getByText(`${MEMBER.email}, member`, { exact: true })).toBeVisible();
  await tryLogIn();
  await mo.waitForURL((url) => url.pathname === "/", { waitUntil: "commit" });
});
