// Date convention: date-only values are stored as UTC midnight and are
// exchanged with the client as "YYYY-MM-DD" strings.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

// Accepts "YYYY-MM-DD" or a full ISO date string; returns a Date or null.
function parseFlexibleDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const strict = parseDateOnly(value.trim());
  if (strict) return strict;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDaysUTC(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

module.exports = {
  parseDateOnly,
  parseFlexibleDate,
  addDaysUTC,
  dateKey,
};
