// Dates are exchanged with the API as "YYYY-MM-DD" strings in local time.
export function toDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parses "YYYY-MM-DD" (or an ISO string from the API) into a local Date at noon.
export function fromDateString(value) {
  if (!value) return new Date();
  const text = String(value).slice(0, 10);
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

// Task dates are stored at UTC midnight, so read the UTC calendar day.
export function apiDateToString(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function addDays(dateString, days) {
  const date = fromDateString(dateString);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function startOfWeek(dateString) {
  const date = fromDateString(dateString);
  const offset = (date.getDay() + 6) % 7; // Monday first
  date.setDate(date.getDate() - offset);
  return toDateString(date);
}

export function monthGrid(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return { date: toDateString(day), day: day.getDate(), inMonth: day.getMonth() === month };
  });
}

export function formatLong(dateString) {
  return fromDateString(dateString).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatShort(value) {
  if (!value) return "";
  const text = typeof value === "string" ? value.slice(0, 10) : apiDateToString(value);
  return fromDateString(text).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Times are stored as 24h "HH:mm"; this only changes how they are shown ("17:05" -> "5:05 PM").
export function formatTime12(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return "";
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function taskMinutes(task) {
  const start = timeToMinutes(task.startTime);
  const end = timeToMinutes(task.endTime);
  return start !== null && end !== null && end > start ? end - start : 0;
}

export function formatHours(minutes) {
  const hours = (minutes || 0) / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];