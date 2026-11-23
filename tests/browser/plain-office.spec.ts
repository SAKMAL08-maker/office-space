import { expect, test } from "@playwright/test";
import { createFirstAdmin, emptyDatabase, greeting, logIn } from "./helpers";

// One screen size is enough here: this page has no phone layout of its own.
test.skip(({ isMobile }) => isMobile, "The plain page is the same on every screen.");

test.beforeEach(async ({ page }) => {
  await emptyDatabase();
  // A browser that cannot draw 3D: asking for WebGL gives nothing, as on very old machines.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      kind: string,
      ...rest: unknown[]
    ) {
      if (kind.startsWith("webgl")) return null;
      return (getContext as (...args: unknown[]) => unknown).call(this, kind, ...rest);
    } as typeof getContext;
  });
});

test("without 3D, the machines are plain buttons that check in and out", async ({ page }) => {
  await createFirstAdmin(page);
  await logIn(page);

  await expect(page.getByText("This browser cannot show the 3D office")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);

  await page.getByRole("button", { name: "Use check-in machine" }).click();
  await expect(greeting(page, /You checked in on/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);

  await page.getByRole("button", { name: "Use check-out machine" }).click();
  await expect(greeting(page, "You are checked out.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
});
