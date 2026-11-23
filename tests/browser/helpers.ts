import { expect, type Page } from "@playwright/test";
import pg from "pg";

/** Made up for the tests only: the app is started with it, and the setup test types it. */
export const BROWSER_SETUP_TOKEN = "browser-test-setup-token-0123456789";

export const ADMIN = {
  name: "Test Admin",
  email: "admin@example.test",
  password: "correct horse battery",
};

/**
 * The browser tests empty every table, so they only run on a database whose name ends in
 * _test, the same rule as the other tests. Anything else stops the run before it starts.
 */
export function testDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error(
      "Browser tests need DATABASE_URL pointing at a database whose name ends in _test.",
    );
  }
  return url;
}

/** Empties every table the app made, so each test starts like a brand new site. */
export async function emptyDatabase() {
  const client = new pg.Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      "select quote_ident(tablename) as name from pg_tables where schemaname = 'public'",
    );
    if (rows.length > 0) {
      await client.query(`truncate ${rows.map((row) => row.name).join(", ")} cascade`);
    }
  } finally {
    await client.end();
  }
}

/** Makes the first admin on /setup, which then sends the browser to /login. */
export async function createFirstAdmin(page: Page) {
  await page.goto("/setup");
  await page.getByLabel("Setup token").fill(BROWSER_SETUP_TOKEN);
  await page.getByLabel("Your name").fill(ADMIN.name);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel(/^Password/).fill(ADMIN.password);
  await page.getByRole("button", { name: "Create admin" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function logIn(page: Page) {
  // Role lookups skip hidden things: Next.js keeps the setup page in the document, hidden.
  await page.getByRole("textbox", { name: "Email" }).fill(ADMIN.email);
  await page.getByRole("textbox", { name: "Password" }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();
  // The 3D home page keeps loading for as long as it is open, so only the address is awaited.
  await page.waitForURL((url) => url.pathname === "/", { waitUntil: "commit" });
}

/** On a phone the greeting and Log out wait behind Menu. On a wide screen there is no Menu. */
export async function openMenuOnPhone(page: Page, isMobile: boolean) {
  // Waits for Menu to appear, since a fresh page load draws it a moment later.
  if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
}

/** The greeting's words, wherever the layout shows them. */
export function greeting(page: Page, text: string | RegExp) {
  return page.getByText(text).filter({ visible: true });
}
