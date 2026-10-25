"use client";

import { useCallback, useEffect, useState } from "react";

// Generic client-side state that's persisted to localStorage and restored on
// mount, so toggles like "last active tab" or "gallery zoom level" survive a
// reload/revisit instead of resetting to a hardcoded default every time.
export function usePersistentState<T>(
  storageKey: string,
  defaultValue: T,
  isValidValue: (value: unknown) => value is T = (value): value is T =>
    value !== null,
) {
  const [value, setValue] = useState<T>(defaultValue);

  // Restore the stored value once on mount (client-only; localStorage isn't
  // available during server rendering).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) return;
      const parsed: unknown = JSON.parse(stored);
      if (isValidValue(parsed)) {
        setValue(parsed);
      }
    } catch {
      // Ignore storage access/parse errors (e.g. private browsing).
    }
    // Only ever restore once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === "function"
            ? (next as (current: T) => T)(current)
            : next;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          // Ignore storage access errors (e.g. private browsing).
        }
        return resolved;
      });
    },
    [storageKey],
  );

  return [value, update] as const;
}
