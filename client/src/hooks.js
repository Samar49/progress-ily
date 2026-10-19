import { createContext, useContext, useEffect, useState } from "react";

// Lets any page open the shared "add / edit task" dialog.
export const TaskDialogContext = createContext({
  openTaskDialog: () => {},
  version: 0,
});

export function useTaskDialog() {
  return useContext(TaskDialogContext);
}

const THEME_KEY = "progressily_theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const THEME_CHOICES = ["light", "dark", "system"];

// "system" follows the device; anything unknown (or missing) is treated as "system".
export function resolveTheme(preference, systemIsDark) {
  if (preference === "light" || preference === "dark") return preference;
  return systemIsDark ? "dark" : "light";
}

// preference = what the user chose ("light" | "dark" | "system")
// theme      = what is actually shown ("light" | "dark")
// A saved "light" or "dark" is kept as is; only new users start on "system".
export function useTheme() {
  const [stored, setPreference] = useLocalStorageState(THEME_KEY, "system");
  const preference = THEME_CHOICES.includes(stored) ? stored : "system";
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia?.(DARK_QUERY).matches ?? false
  );

  // Follow the device live (e.g. Windows switching to dark at sunset).
  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);
    if (!query) return undefined;
    const onChange = (event) => setSystemIsDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return { preference, theme: resolveTheme(preference, systemIsDark), setPreference };
}

export function useLocalStorageState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : JSON.parse(stored);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode) - ignore */
    }
  }, [key, value]);

  return [value, setValue];
}