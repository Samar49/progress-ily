const test = require("node:test");
const assert = require("node:assert/strict");

const { parseDateOnly, parseFlexibleDate, addDaysUTC, dateKey } = require("../utils/dates");
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
    40
  );
  assert.equal(computeGoalProgress({ progressMode: "measurable", targetValue: 0, currentValue: 5 }), 0);
  assert.equal(computeGoalProgress({ progressMode: "manual", manualProgress: 140 }), 100);
});

test("legacy goals without a mode prefer linked tasks, then manual progress", () => {
  assert.equal(computeGoalProgress({ manualProgress: 70 }, { total: 2, completed: 1 }), 50);
  assert.equal(computeGoalProgress({ manualProgress: 70 }, null), 70);
});
