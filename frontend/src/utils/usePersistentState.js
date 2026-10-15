import { useEffect, useState } from "react";

// useState backed by localStorage. Storage can be full (data-URL photos) or blocked,
// so every access is guarded and the app keeps working in memory.
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch { /* fall through to seed data */ }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota or blocked — in-memory only */ }
  }, [key, value]);

  return [value, setValue];
}

export function clearPersistedState(keys) {
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
}
