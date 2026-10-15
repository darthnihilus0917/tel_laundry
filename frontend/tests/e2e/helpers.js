// Opens the staff portal (not linked from customer pages — entered via /#staff) and picks a role.
export async function openStaff(page, role = "owner") {
  await page.goto("/#staff");
  await roleSelect(page).selectOption(role);
}

export const roleSelect = (page) => page.locator('select:has(option[value="rider"][label="Rider"], option[value="rider"])').first();

export const nav = (page, name) => page.getByRole("button", { name, exact: true });

export const card = (page, text) => page.locator("div.rounded-xl", { hasText: text }).last();

// 1x1 PNG for photo-upload fields.
export const PNG = {
  name: "photo.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
};
