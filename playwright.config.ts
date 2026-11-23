import { defineConfig } from "@playwright/test";
import { BROWSER_SETUP_TOKEN, testDatabaseUrl } from "./tests/browser/helpers";

// Stops here, before the app starts, unless the database is a throwaway one.
testDatabaseUrl();

/** The browser tests get their own port, so they never meet a `next dev` on 3000. */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

// No graphics card in CI: Chromium draws the 3D office in software instead.
const softwareGraphics = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

export default defineConfig({
  testDir: "tests/browser",
  // Every test empties the one test database, so they take turns.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  // One retry in CI. A test that only passes on the retry is reported as "flaky", not hidden.
  retries: process.env.CI ? 1 : 0,
  // Two walks to the machines. Software graphics can freeze the page for a while.
  timeout: 360_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    browserName: "chromium",
    launchOptions: { args: softwareGraphics },
    // Kept only when a test fails, so CI can hand them over for a look.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    {
      name: "phone",
      use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    // The built app, the closest thing to what Vercel serves.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `${BASE_URL}/login`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      BETTER_AUTH_URL: BASE_URL,
      SETUP_TOKEN: BROWSER_SETUP_TOKEN,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ?? "browser-test-only-secret-0123456789abcdef",
    },
  },
});
