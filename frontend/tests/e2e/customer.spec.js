import { test, expect } from "@playwright/test";
import { PNG, openStaff, nav, card } from "./helpers.js";

// Pin the clock (Manila = UTC+8) so the 6:30 PM and 1:00 PM cut-offs are exercised deterministically.
const AFTER_CUTOFF = Date.UTC(2026, 7, 8, 11, 0); // 7:00 PM Manila
const BEFORE_1PM = Date.UTC(2026, 7, 8, 2, 0); // 10:00 AM Manila
const MID_AFTERNOON = Date.UTC(2026, 7, 8, 6, 30); // 2:30 PM Manila

// Splash screen: email + 4-digit PIN on the "Log in" tab (seed customers use first.last@example.com).
async function signIn(page, email = "ana.reyes@example.com", pin = "1234") {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("4-digit PIN").fill(pin);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
}

test("splash: brand on top, log in / register below with Google or email + PIN", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The Empress Laundry" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Log in" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("4-digit PIN")).toBeVisible();

  await page.getByRole("tab", { name: "Register" }).click();
  await expect(page.getByRole("button", { name: "Sign up with Google" })).toBeVisible();
  await expect(page.getByLabel("Create 4-digit PIN")).toBeVisible();
  await expect(page.getByLabel("Confirm PIN")).toBeVisible();
});

test("email registration validates, then collects the profile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Register" }).click();

  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Create 4-digit PIN").fill("4321");
  await page.getByLabel("Confirm PIN").fill("1111");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();

  await page.getByLabel("Email").fill("ana.reyes@example.com"); // already registered
  await page.getByLabel("Confirm PIN").fill("4321");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText(/already registered/)).toBeVisible();

  await page.getByLabel("Email").fill("pat.new@example.com");
  await page.getByLabel("Confirm PIN").fill("9999");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText("PINs don't match")).toBeVisible();

  await page.getByLabel("Confirm PIN").fill("4321");
  await page.getByRole("button", { name: /Create account/ }).click();
  await expect(page.getByText("Signing up as")).toContainText("pat.new@example.com");
  await expect(page.getByLabel("4-digit PIN")).toHaveCount(0); // the PIN was already set on the splash
});

test("Google sign-up: account chooser, then profile step with the name pre-filled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Register" }).click();
  await page.getByRole("button", { name: "Sign up with Google" }).click();
  await expect(page.getByRole("dialog", { name: /Choose a Google account/ })).toBeVisible();
  await page.getByRole("button", { name: /maria.santos@gmail.com/ }).click();

  await expect(page.getByText("Signing up as")).toContainText("maria.santos@gmail.com");
  await expect(page.getByLabel("First name")).toHaveValue("MARIA");
  await page.getByLabel("Contact number").fill("0933 000 1111");
  await page.locator("#reg-pickup-unit").fill("Unit 9");
  await page.locator("#reg-pickup-subdivision").fill("Gmail Heights");
  await page.locator("#reg-pickup-barangay").fill("Central");
  await page.locator("#reg-pickup-city").fill("Pasig");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Finish registration/ }).click();
  await expect(page.getByText("You're registered")).toBeVisible();
  await page.getByRole("button", { name: /Go to my Account/ }).click();
  await expect(page.getByText("UNIT 9", { exact: false })).toBeVisible();
});

test("a refresh keeps the customer signed in; log out returns to the splash", async ({ page }) => {
  await signIn(page);
  await expect(page.getByText(/Ready for laundry day/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Ready for laundry day/)).toBeVisible();
  await page.getByRole("button", { name: /Log Out/ }).click();
  await expect(page.getByRole("tab", { name: "Log in" })).toBeVisible();
});

test("customer landing hides staff entry and registers with split name, 5-box address and PIN", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /staff/i })).toHaveCount(0);

  await page.getByRole("tab", { name: "Register" }).click();
  await page.getByLabel("Email").fill("maria.clara@example.com");
  await page.getByLabel("Create 4-digit PIN").fill("4321");
  await page.getByLabel("Confirm PIN").fill("4321");
  await page.getByRole("button", { name: /Create account/ }).click();

  await page.getByLabel("First name").fill("Maria");
  await page.getByLabel("Last name").fill("Clara");
  await page.getByLabel("Contact number").fill("0999 123 4567");
  await page.locator("#reg-pickup-unit").fill("Unit 5, Aster St.");
  await page.locator("#reg-pickup-subdivision").fill("Aster Village");
  await page.locator("#reg-pickup-barangay").fill("Sampaguita");
  await page.locator("#reg-pickup-city").fill("Manila");
  await page.getByRole("button", { name: /Finish registration/ }).click();
  await expect(page.getByText("Please confirm to continue")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Finish registration/ }).click();
  await expect(page.getByText("You're registered")).toBeVisible();

  // names/addresses are stored in capitals
  await page.getByRole("button", { name: /Go to my Account/ }).click();
  await expect(page.getByText("UNIT 5, ASTER ST.", { exact: false })).toBeVisible();
});

test("wrong PIN is rejected", async ({ page }) => {
  await signIn(page, "ana.reyes@example.com", "0000");
  await expect(page.getByText(/don't match/)).toBeVisible();
});

test("lobby pickup: GCash forced, photo required, payment banner, success pop-up, order id format", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Schedule a pickup" }).click();

  const deluxe = page.getByRole("checkbox", { name: "Deluxe Package 2" });
  await deluxe.check();
  const instr = page.getByLabel("Special instruction for Deluxe Package 2");
  await instr.fill("no softener please");
  await expect(instr).toHaveValue("NO SOFTENER PLEASE");
  await deluxe.uncheck();
  await expect(instr).toHaveCount(0);
  await deluxe.check();

  const banner = page.getByTestId("payment-banner");
  await expect(banner).toContainText("Pay upon delivery");
  await expect(banner).toContainText("Your final bill will be calculated at the shop. We will update you here.");

  await page.getByLabel("Handover Method").selectOption("Leave at Lobby");
  await expect(page.getByLabel("Payment Method")).toHaveValue("GCash");
  await expect(page.getByLabel("Payment Method").locator('option[value="Cash"]')).toBeDisabled();
  await expect(banner).toContainText("Pay before delivery");

  await page.getByRole("button", { name: "Confirm Pick-up Request" }).click();
  await expect(page.getByText("Please attach a photo of your bag/basket", { exact: true })).toBeVisible();
  await page.getByLabel("photo of bag/basket").setInputFiles(PNG);
  await expect(page.getByText(/attached — replace/)).toBeVisible();

  await page.getByRole("button", { name: "Confirm Pick-up Request" }).click();
  await expect(page.getByText("Request received! Track your order in your Dashboard.")).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();

  const newest = page.locator('[data-testid^="order-TEL-"]').first();
  await expect(newest.getByText("Request Sent")).toBeVisible();
  await expect(newest.getByText("To be calculated")).toBeVisible();
  await expect(newest.getByRole("button", { name: "Cancel this pickup" })).toBeVisible();
  await expect(newest.getByRole("button", { name: "Report an issue with this order" })).toHaveCount(0);
  const id = await newest.getAttribute("data-testid");
  expect(id).toMatch(/^order-TEL-\d{6}-1010$/); // continues the counter after the 9 seeded orders
});

test("cancel pop-up: No keeps the form, Yes returns to the dashboard", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: "Schedule a pickup" }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Cancel pickup?")).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm Pick-up Request" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(page.getByText("Your Orders")).toBeVisible();
});

test("after 6:30 PM Manila time Today is disabled and Tomorrow is the default; day 3 is always disabled", async ({ page }) => {
  await page.addInitScript((t) => { window.__TEL_NOW = t; }, AFTER_CUTOFF);
  await signIn(page);
  await page.getByRole("button", { name: "Schedule a pickup" }).click();
  const date = page.getByLabel("Pickup Date");
  const options = date.locator("option");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveText("Aug. 8, Saturday");
  await expect(options.nth(0)).toBeDisabled();
  await expect(options.nth(1)).toBeEnabled();
  await expect(options.nth(2)).toBeDisabled();
  await expect(date).toHaveValue("2026-08-09");
});

test("today's morning slot closes at 1:00 PM", async ({ page }) => {
  await page.addInitScript((t) => { window.__TEL_NOW = t; }, MID_AFTERNOON);
  await signIn(page);
  await page.getByRole("button", { name: "Schedule a pickup" }).click();
  await expect(page.getByLabel("Pickup Date")).toHaveValue("2026-08-08");
  await expect(page.getByLabel("Pickup Time").locator("option").nth(0)).toBeDisabled();
  await expect(page.getByLabel("Pickup Time").locator("option").nth(1)).toBeEnabled();
});

test("before 1:00 PM both slots are open today", async ({ page }) => {
  await page.addInitScript((t) => { window.__TEL_NOW = t; }, BEFORE_1PM);
  await signIn(page);
  await page.getByRole("button", { name: "Schedule a pickup" }).click();
  await expect(page.getByLabel("Pickup Time").locator("option").nth(0)).toBeEnabled();
});

test("order card buttons follow status", async ({ page }) => {
  // ANA's seeded orders: 1001 = Request Sent, 1007 = Delivered
  await signIn(page);
  const requestSent = page.locator('[data-testid$="-1001"]');
  await expect(requestSent.getByText("Request Sent")).toBeVisible();
  await expect(requestSent.getByRole("button", { name: "Follow up on order" })).toBeVisible();
  await expect(requestSent.getByRole("button", { name: "Cancel this pickup" })).toBeVisible();

  const delivered = page.locator('[data-testid$="-1007"]');
  await expect(delivered.getByRole("button", { name: "Report an issue with this order" })).toBeVisible();
  await expect(delivered.getByRole("button", { name: "Follow up on order" })).toHaveCount(0);
  await expect(delivered.getByRole("button", { name: "Cancel this pickup" })).toHaveCount(0);

  await delivered.getByRole("button", { name: "Report an issue with this order" }).click();
  await expect(delivered.getByLabel("Subject")).toHaveValue(/^Issue with Order ID #TEL-\d{6}-1007$/);
  await expect(delivered.getByLabel("Subject")).toHaveAttribute("readonly", "");
});

test("rider marks 'Rider will return' with a required reason", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Rider view").click();
  const job = card(page, "MARK SANTOS");
  await job.getByRole("button", { name: "Rider will return" }).click();
  const confirm = page.getByRole("button", { name: "Mark Rider Will Return" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Reason", { exact: true }).selectOption("Other (Please specify)");
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Specify the reason").fill("gate locked");
  await confirm.click();
  await expect(card(page, "MARK SANTOS").getByText("Unsuccessful pickup: GATE LOCKED")).toBeVisible();
});

test("lobby customer pays via GCash after the rider sets the final amount; admin can reject", async ({ page }) => {
  // 1) rider sets the final amount for MARK SANTOS (seeded lobby/GCash order, Rider on the Way)
  await openStaff(page, "owner");
  await nav(page, "Rider view").click();
  const job = card(page, "MARK SANTOS");
  await job.getByLabel("Final amount (₱)").fill("235");
  await job.getByRole("button", { name: "Save amount" }).click();

  // 2) customer sees the final amount and pays
  await signIn(page, "mark.santos@example.com", "1234");
  await expect(page.getByText("₱235 • Final • Pay before delivery • GCash")).toBeVisible();
  await page.getByRole("button", { name: "Pay via GCash" }).click();
  await expect(page.getByText("Please settle the final amount of ₱235")).toBeVisible();
  const submit = page.getByRole("button", { name: "Submit Payment" });
  await expect(submit).toBeDisabled();
  await page.getByLabel("payment receipt").setInputFiles(PNG);
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText("₱235 • Final • Payment being verified • GCash")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pay via GCash" })).toHaveCount(0);

  // 3) admin gets the group-chat alert and the ledger row, rejects the receipt
  await page.goto("/#staff");
  await page.reload();
  await nav(page, "Group chat outbox").click();
  await expect(page.getByText("NEW PAYMENT RECEIPT UPLOADED")).toBeVisible();
  await expect(page.getByText("HANDOVER METHOD: LEAVE AT LOBBY").first()).toBeVisible();
  await nav(page, "Payments").click();
  const row = page.getByRole("row", { name: /MARK SANTOS/ });
  await row.getByRole("button", { name: "Reject" }).click();
  await page.getByLabel("Reason", { exact: true }).selectOption("Receipt is blurry or unreadable");
  await page.getByRole("button", { name: "Reject receipt" }).click();
  await expect(row.getByText("Awaiting Re-upload")).toBeVisible();
});

test("owner sees CRM money columns; attendant does not; headers sort", async ({ page }) => {
  await openStaff(page, "owner");
  await nav(page, "Customers").click();
  await expect(page.getByRole("columnheader", { name: /Total Transacted Amount/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Average Order Value/ })).toBeVisible();
  const names = page.locator("tbody tr td:first-child");
  await expect(names.first()).toHaveText("ANA REYES");
  await page.getByRole("button", { name: "Name" }).click();
  await expect(names.first()).toHaveText("PAOLO REYES");

  await openStaff(page, "attendant");
  await nav(page, "Customers").click();
  await expect(page.getByRole("columnheader", { name: /Total Transacted Amount/ })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: /^Orders$/ })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: /Average Order Value/ })).toHaveCount(0);
});

test("owner dashboard shows live daily metrics with a highlighted Today box", async ({ page }) => {
  await openStaff(page, "owner");
  await expect(page.getByText("(Today)").first()).toBeVisible();
  await expect(page.getByTestId("metrics-summary")).toBeVisible();
});
