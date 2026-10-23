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

// The browser sends its UTC offset (Date#getTimezoneOffset, in minutes; UTC+5:30 is -330)
// so days can be grouped in the user's local time. Returns null when it is invalid.
function parseTzOffset(value) {
  if (value === undefined) return 0;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const minutes = Number(value);
  return minutes >= -840 && minutes <= 720 ? minutes : null;
}

// The exact moment a local calendar day starts, for a date-only value stored at UTC midnight.
function localDayStart(dateOnly, tzOffsetMinutes = 0) {
  return new Date(dateOnly.getTime() + tzOffsetMinutes * 60000);
}

// The local "YYYY-MM-DD" a moment falls on.
function localDateKey(value, tzOffsetMinutes = 0) {
  return new Date(new Date(value).getTime() - tzOffsetMinutes * 60000).toISOString().slice(0, 10);
}

module.exports = {
  parseDateOnly,
  parseFlexibleDate,
  addDaysUTC,
  dateKey,
  parseTzOffset,
  localDayStart,
  localDateKey,
};
