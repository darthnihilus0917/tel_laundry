import { HttpError } from "./domain.js";

export function requireText(value, field) {
  const v = String(value ?? "").trim();
  if (!v) throw new HttpError(400, `${field} is required`);
  return v;
}

export function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  return value;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Returns the trimmed, lower-cased email, or null when omitted and optional.
export function parseEmail(value, { required = false } = {}) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) {
    if (required) throw new HttpError(400, "email is required");
    return null;
  }
  if (!EMAIL.test(v)) throw new HttpError(400, "email is not a valid address");
  return v;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireUuid(value, field) {
  if (!UUID.test(String(value ?? ""))) throw new HttpError(400, `${field} must be a valid id`);
  return value;
}

const ADDRESS_KEYS = ["unit", "subdivision", "barangay", "city", "landmark"];

// Structured address: unit, subdivision, barangay and city required; landmark optional. Stored in capitals.
export function parseAddress(value, field, { required = true } = {}) {
  if (value == null && !required) return null;
  if (typeof value !== "object" || Array.isArray(value) || value === null) {
    throw new HttpError(400, `${field} must be an address object`);
  }
  const out = {};
  for (const k of ADDRESS_KEYS) out[k] = String(value[k] ?? "").trim().toUpperCase();
  for (const k of ["unit", "subdivision", "barangay", "city"]) {
    if (!out[k]) throw new HttpError(400, `${field}.${k} is required`);
  }
  return out;
}

export function parseDataUrl(value, field) {
  const v = String(value ?? "");
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(v)) throw new HttpError(400, `${field} must be a base64 image data URL`);
  return v;
}
