export const CATEGORIES = ["Global", "Fitness", "Project", "Studies", "Work", "Personal", "Other"];

export const PRIORITIES = ["Low", "Medium", "High"];
export const STATUSES = ["Pending", "In Progress", "Completed"];

export const GOAL_STATUSES = ["Not Started", "Active", "Completed", "On Hold"];
export const GOAL_CATEGORIES = [
  "Career",
  "Skill Development",
  "Health",
  "Learning",
  "Finance",
  "Personal",
  "Other",
];
export const GOAL_TERMS = ["Short Term", "Medium Term", "Long Term"];

// "DSA" is no longer selectable, but older tasks that use it still display
// (colors below) and the API still accepts it.
// Chart / schedule colors per task category (match the design palette).
export const CATEGORY_COLORS = {
  DSA: "#07865c",
  Global: "#3b82f6",
  Fitness: "#f87171",
  Project: "#8b5cf6",
  Studies: "#f59e0b",
  Work: "#0ea5e9",
  Personal: "#fb923c",
  Other: "#94a3b8",
};

export const GOAL_CATEGORY_COLORS = {
  Career: "#07865c",
  "Skill Development": "#3b82f6",
  Health: "#f87171",
  Learning: "#fbbf24",
  Finance: "#8b5cf6",
  Personal: "#fb923c",
  Other: "#cbd5e1",
};

export const GOAL_STATUS_COLORS = {
  Active: "#07865c",
  Completed: "#86d4b5",
  "On Hold": "#fbbf24",
  "Not Started": "#d6dde7",
};

export const QUOTES = [
  "Consistency turns plans into progress.",
  "A little progress each day adds up to big results.",
  "Small steps today, big progress tomorrow.",
  "Focus on the next right action.",
];
