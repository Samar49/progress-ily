import { createContext, useContext, useEffect, useState } from "react";

// Lets any page open the shared "add / edit task" dialog.
export const TaskDialogContext = createContext({
  openTaskDialog: () => {},
  version: 0,
});

export function useTaskDialog() {
  return useContext(TaskDialogContext);
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
