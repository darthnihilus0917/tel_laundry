import { test, expect } from "@playwright/test";
import { openStaff, nav, card } from "./helpers.js";

test("role gating limits the nav per role", async ({ page }) => {
  await openStaff(page, "owner");
  await expect(nav(page, "Dashboard")).toBeVisible();
  await expect(nav(page, "Payments")).toBeVisible();

  await openStaff(page, "rider");
  await expect(nav(page, "Rider view")).toBeVisible();
  await expect(nav(page, "Complaints")).toBeVisible();
  await expect(nav(page, "Dashboard")).toHaveCount(0);
  await expect(nav(page, "Payments")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Rider view" })).toBeVisible();
});

test("attendant weighs a load, prices it and queues it for the shop", async ({ page }) => {
  await openStaff(page, "attendant");
  await expect(page.getByRole("heading", { name: "Attendant — shop queue" })).toBeVisible();

  const intake = card(page, "LIZA CRUZ");
  await intake.getByPlaceholder("Weight (kg)").fill("9");
  await expect(intake.getByText(/billed as 2 loads/)).toBeVisible();
  await expect(intake.getByText("₱420")).toBeVisible();
  await intake.getByRole("button", { name: /Log & queue for wash/ }).click();

  // now in the shop queue, with the weight/price recorded
  const inShop = card(page, "LIZA CRUZ");
  await expect(inShop.getByText("9kg · ₱420")).toBeVisible();
  await inShop.getByRole("button", { name: /Mark ready for delivery/ }).click();

  await nav(page, "Dispatch board").click();
  await expect(page.locator("div.rounded-lg", { hasText: /1003/ }).getByText("Ready for Delivery").first()).toBeVisible();
});

test("delivery cannot be verified without a logged payment, then completes once verified", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Rider view").click();
  await page.locator("select", { hasText: "Jun (Rider)" }).selectOption({ label: "Bong (Rider)" });

  const job = card(page, "GRACE DELA CRUZ");
  await job.getByRole("button", { name: "Start delivery" }).click();
  await job.getByRole("button", { name: "Mark delivered" }).click();
  await job.getByRole("button", { name: "Send for payment verification" }).click();
  await expect(job.getByText("Log the payment before sending for verification").first()).toBeVisible();

  await job.getByRole("button", { name: "Log payment" }).click();
  await job.getByRole("button", { name: "Send for payment verification" }).click();

  // verification belongs to the Payments tab; verifying completes the order
  await nav(page, "Payments").click();
  const row = page.getByRole("row", { name: /1005/ });
  await expect(row.getByText("Pending Verification")).toBeVisible();
  await row.getByRole("button", { name: "Verify Payment" }).click();
  await expect(row.getByText("Verified")).toBeVisible();
  await expect(row.getByText("Owner")).toBeVisible();

  await nav(page, "Dispatch board").click();
  await expect(card(page, "GRACE DELA CRUZ").getByText("Completed").first()).toBeVisible();
});

test("complaint can be assigned, updated while in progress, then resolved", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Complaints").click();

  const ticket = card(page, "Hi, is my laundry ready?");
  await ticket.locator("select").selectOption({ label: "Nena (Attendant)" });
  await ticket.getByRole("button", { name: "Post update" }).click();
  await ticket.getByPlaceholder("Status update for the customer…").fill("Folding now, ready by 3pm");
  await ticket.getByRole("button", { name: "Save" }).click();
  await expect(ticket.getByText("Latest update: Folding now, ready by 3pm")).toBeVisible();
  await expect(ticket.getByText("In Progress")).toBeVisible();

  await ticket.getByRole("button", { name: "Resolve" }).click();
  await ticket.getByPlaceholder("Resolution note…").fill("Delivered");
  await ticket.getByRole("button", { name: "Save" }).click();
  await expect(ticket.getByText("Resolution: Delivered")).toBeVisible();
});

test("state persists across a reload, and reset restores demo data", async ({ page }) => {
  await openStaff(page, "attendant");
  const intake = card(page, "LIZA CRUZ");
  await intake.getByRole("button", { name: /Log & queue for wash/ }).click();
  await expect(card(page, "LIZA CRUZ").getByRole("button", { name: /Mark ready for delivery/ })).toBeVisible();

  await page.reload();
  // role was remembered, and Liza's order is still in the shop queue
  await expect(page.getByRole("heading", { name: "Attendant — shop queue" })).toBeVisible();
  await expect(card(page, "LIZA CRUZ").getByRole("button", { name: /Mark ready for delivery/ })).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(card(page, "LIZA CRUZ").getByRole("button", { name: /Log & queue for wash/ })).toBeVisible();
});
