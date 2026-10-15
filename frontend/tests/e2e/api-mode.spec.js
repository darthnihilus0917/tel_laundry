// Runs only against the backend build:  npm run test:e2e:api
// Needs: Postgres + backend running on a freshly seeded database (backend: npm run db:reset).
import { test, expect } from "@playwright/test";
import { openStaff, nav, card } from "./helpers.js";

test.skip(process.env.E2E_MODE !== "api", "api-mode tests need the backend (npm run test:e2e:api)");

test("@api staff app loads its data from the server and shows the live badge", async ({ page }) => {
  await openStaff(page, "owner");
  await expect(page.getByText("Live · connected to server")).toBeVisible();
  await nav(page, "Customers").click();
  await expect(page.getByText("ANA REYES").first()).toBeVisible();
});

test("@api attendant weigh-in is saved in the database and survives a reload", async ({ page }) => {
  await openStaff(page, "attendant");
  const intake = card(page, "LIZA CRUZ");
  await intake.getByPlaceholder("Weight (kg)").fill("9");
  await intake.getByRole("button", { name: /Log & queue for wash/ }).click();
  await expect(card(page, "LIZA CRUZ").getByText("9kg · ₱420")).toBeVisible();

  await page.reload();
  await expect(card(page, "LIZA CRUZ").getByText("9kg · ₱420")).toBeVisible();
});

test("@api the server enforces the payment gate", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Rider view").click();
  await page.locator("select", { hasText: "Jun (Rider)" }).selectOption({ label: "Bong (Rider)" });
  const job = card(page, "GRACE DELA CRUZ");
  await job.getByRole("button", { name: "Start delivery" }).click();
  await job.getByRole("button", { name: "Mark delivered" }).click();
  await job.getByRole("button", { name: "Send for payment verification" }).click();
  await expect(job.getByText("Log the payment before sending for verification").first()).toBeVisible();
});

test("@api complaint assignment and updates are stored server-side", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Complaints").click();
  const ticket = card(page, "Hi, is my laundry ready?");
  await ticket.locator("select").selectOption({ label: "Nena (Attendant)" });
  await expect(ticket.getByText("In Progress")).toBeVisible();
  await page.reload();
  await nav(page, "Complaints").click(); // a reload lands back on the dashboard
  await expect(card(page, "Hi, is my laundry ready?").getByText("In Progress")).toBeVisible();
});

test("@api customer signs in with email + PIN checked by the server", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled(); // not set up on the server
  await page.getByLabel("Email").fill("ana.reyes@example.com");
  await page.getByLabel("4-digit PIN").fill("0000");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText(/don't match/)).toBeVisible();

  await page.getByLabel("4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByText(/Ready for laundry day/)).toBeVisible();
});
