// Structured address: five boxes on every form, combined the same way everywhere it is displayed.
export const EMPTY_ADDRESS = { unit: "", subdivision: "", barangay: "", city: "", landmark: "" };

export const ADDRESS_FIELDS = [
  { key: "unit", label: "House / Unit / Room No. & Street", required: true },
  { key: "subdivision", label: "Subdivision / Village / Building Name", required: true },
  { key: "barangay", label: "Barangay", required: true },
  { key: "city", label: "City / Municipality", required: true },
  { key: "landmark", label: "Landmark (optional — e.g., near 7-Eleven, blue gate)", required: false },
];

export function addressComplete(a) {
  return !!a && ADDRESS_FIELDS.filter((f) => f.required).every((f) => a[f.key]?.trim());
}

export function addressBlank(a) {
  return !a || ADDRESS_FIELDS.every((f) => !a[f.key]?.trim());
}

export function formatAddress(a) {
  if (!a) return "—";
  const main = [a.unit, a.subdivision, a.barangay, a.city].map((s) => s?.trim()).filter(Boolean).join(", ");
  return a.landmark?.trim() ? `${main} (Landmark: ${a.landmark.trim()})` : main;
}
