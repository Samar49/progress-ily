const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseDateOnly,
  parseFlexibleDate,
  addDaysUTC,
  dateKey,
  parseTzOffset,
  localDayStart,
  localDateKey,
} = require("../utils/dates");
const { computeGoalProgress } = require("../utils/goalProgress");

test("parseDateOnly accepts valid dates and rejects invalid ones", () => {
  assert.equal(parseDateOnly("2026-10-14").toISOString(), "2026-10-14T00:00:00.000Z");
  assert.equal(parseDateOnly("2026-02-30"), null);
  assert.equal(parseDateOnly("14-10-2026"), null);
  assert.equal(parseDateOnly(20261014), null);
});

test("parseFlexibleDate handles date-only and ISO strings", () => {
  assert.ok(parseFlexibleDate("2026-10-14"));
  assert.ok(parseFlexibleDate("2026-10-14T10:00:00.000Z"));
  assert.equal(parseFlexibleDate("nope"), null);
  assert.equal(parseFlexibleDate(""), null);
});

test("addDaysUTC and dateKey work across month boundaries", () => {
  const next = addDaysUTC(parseDateOnly("2026-10-31"), 1);
  assert.equal(dateKey(next), "2026-11-01");
});

test("goal progress follows the selected mode", () => {
  assert.equal(computeGoalProgress({ progressMode: "tasks" }, { total: 4, completed: 1 }), 25);
  assert.equal(computeGoalProgress({ progressMode: "tasks" }, null), 0);
  assert.equal(
    computeGoalProgress({ progressMode: "measurable", targetValue: 300, currentValue: 120 }),
    40,
  );
  assert.equal(
    computeGoalProgress({ progressMode: "measurable", targetValue: 0, currentValue: 5 }),
    0,
  );
  assert.equal(computeGoalProgress({ progressMode: "manual", manualProgress: 140 }), 100);
});

test("legacy goals without a mode prefer linked tasks, then manual progress", () => {
  assert.equal(computeGoalProgress({ manualProgress: 70 }, { total: 2, completed: 1 }), 50);
  assert.equal(computeGoalProgress({ manualProgress: 70 }, null), 70);
});

test("parseTzOffset accepts whole minutes in range and rejects the rest", () => {
  assert.equal(parseTzOffset(undefined), 0);
  assert.equal(parseTzOffset("-330"), -330);
  assert.equal(parseTzOffset("300"), 300);
  assert.equal(parseTzOffset("abc"), null);
  assert.equal(parseTzOffset("5.5"), null);
  assert.equal(parseTzOffset("900"), null);
  assert.equal(parseTzOffset(["1", "2"]), null);
});

test("local day helpers follow the user's timezone (India, UTC+5:30)", () => {
  const india = -330; // what Date#getTimezoneOffset() returns in India

  // Monday 02:00 in India is still Sunday 20:30 in UTC.
  const session = "2026-10-18T20:30:00.000Z";
  assert.equal(dateKey(session), "2026-10-18");
  assert.equal(localDateKey(session, india), "2026-10-19");

  // A local day in India starts at 18:30 UTC the evening before.
  const monday = parseDateOnly("2026-10-19");
  assert.equal(localDayStart(monday, india).toISOString(), "2026-10-18T18:30:00.000Z");

  // Behind UTC (New York in winter, UTC-5) a local day starts later than UTC midnight.
  assert.equal(localDayStart(monday, 300).toISOString(), "2026-10-19T05:00:00.000Z");
  assert.equal(localDateKey("2026-10-19T03:00:00.000Z", 300), "2026-10-18");

  // With no offset nothing changes.
  assert.equal(localDateKey(session), "2026-10-18");
});
