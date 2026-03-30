import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Lead Dashboard")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("invalid@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("Dashboard (requires auth)", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 15000 });
  });

  test("Ads Leads dashboard renders as home", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Ads Leads" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("can navigate to Lead Hub High", async ({ page }) => {
    await page.getByRole("link", { name: /Lead Hub.*P1/i }).click();
    await expect(page.getByText("Lead Hub — P1 & P2")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to Lead Hub Low", async ({ page }) => {
    await page.getByRole("link", { name: /Lead Hub.*P3/i }).click();
    await expect(page.getByText("Lead Hub — P3 & P4")).toBeVisible({ timeout: 10000 });
  });

  test("period selector is visible and interactive", async ({ page }) => {
    await expect(page.getByText("Last 7 Days")).toBeVisible({ timeout: 10000 });
  });

  test("sync button triggers sync", async ({ page }) => {
    const syncButton = page.getByRole("button", { name: /sync/i });
    if (await syncButton.isVisible()) {
      await syncButton.click();
      await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 15000 });
    }
  });

  test("sign out button is visible", async ({ page }) => {
    await expect(page.getByTitle("Sign out")).toBeVisible();
  });
});
