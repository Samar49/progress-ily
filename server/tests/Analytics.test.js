// Verifies the analytics maths with in-memory stand-ins for the Mongoose
// models (no database needed).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const USER = "507f1f77bcf86cd799439011";
const iso = (day) => new Date(`${day}T00:00:00.000Z`);

const tasks = [
  { date: iso("2026-10-16"), category: "DSA", priority: "High", status: "Completed", goalId: "g1" },
  { date: iso("2026-10-16"), category: "DSA", priority: "Medium", status: "Pending", goalId: "g1" },
  {
    date: iso("2026-10-15"),
    category: "Fitness",
    priority: "High",
    status: "In Progress",
    goalId: null,
  },
  {
    date: iso("2026-10-10"),
    category: "Global",
    priority: "Low",
    status: "Completed",
    goalId: null,
  },
  { date: iso("2026-09-01"), category: "Global", priority: "Low", status: "Pending", goalId: null },
];
const goals = [
  {
    _id: "g1",
    title: "Linked",
    status: "Active",
    targetDate: iso("2026-10-18"),
    progressMode: "tasks",
  },
  {
    _id: "g2",
    title: "Measured",
    status: "Active",
    targetDate: iso("2026-10-01"),
    progressMode: "measurable",
    targetValue: 300,
    currentValue: 120,
  },
  {
    _id: "g3",
    title: "Done",
    status: "Completed",
    targetDate: iso("2026-12-31"),
    progressMode: "manual",
    manualProgress: 100,
  },
  {
    _id: "g4",
    title: "Paused",
    status: "On Hold",
    targetDate: iso("2026-12-31"),
    progressMode: "manual",
    manualProgress: 25,
  },
  {
    _id: "g5",
    title: "Later",
    status: "Not Started",
    targetDate: iso("2027-01-31"),
    progressMode: "manual",
    manualProgress: 0,
  },
];

function chain(rows) {
  return {
    select() {
      return this;
    },
    sort() {
      return this;
    },
    lean: async () => rows,
  };
}
function inject(file, exports) {
  const full = require.resolve(path.join("..", file));
  require.cache[full] = { id: full, filename: full, loaded: true, exports };
}

inject("models/Task.js", {
  find(filter) {
    let rows = tasks;
    const range = filter.date;
    if (range?.$gte) rows = rows.filter((t) => t.date >= range.$gte);
    if (range?.$lt) rows = rows.filter((t) => t.date < range.$lt);
    return chain(rows);
  },
  async aggregate() {
    const grouped = {};
    for (const t of tasks.filter((x) => x.goalId)) {
      const g = (grouped[t.goalId] ||= { _id: t.goalId, total: 0, completed: 0 });
      g.total += 1;
      if (t.status === "Completed") g.completed += 1;
    }
    return Object.values(grouped);
  },
});
inject("models/Goal.js", { find: () => chain(goals) });

const { getAnalyticsSummary } = require("../controllers/analyticsController");

async function call(query) {
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  await getAnalyticsSummary({ userId: USER, query }, res);
  return res;
}

test("counts, completion rate and breakdowns reconcile with the data", async () => {
  const { body } = await call({ today: "2026-10-16" });
  const s = body.summary;
  assert.deepEqual(s.taskCounts, {
    total: 5,
    completed: 2,
    pending: 2,
    inProgress: 1,
    highPriority: 2,
  });
  assert.equal(s.completionRate, 40);
  assert.equal(
    s.categoryBreakdown.reduce((n, c) => n + c.count, 0),
    5,
  );
  assert.equal(
    s.priorityBreakdown.reduce((n, c) => n + c.count, 0),
    5,
  );
  assert.equal(s.categoryBreakdown[0].count, 2);
});

test("seven-day trend ends on the client's today, not the server's UTC day", async () => {
  const { body } = await call({ today: "2026-10-16" });
  const trend = body.summary.dailyTrend;
  assert.equal(trend.length, 7);
  assert.equal(trend[0].date, "2026-10-10");
  assert.equal(trend[6].date, "2026-10-16");
  assert.deepEqual([trend[6].total, trend[6].completed], [2, 1]);
  assert.deepEqual([trend[5].total, trend[5].completed], [1, 0]);
  assert.deepEqual([trend[0].total, trend[0].completed], [1, 1]);
});

test("date range filters tasks inclusively", async () => {
  const { body } = await call({
    today: "2026-10-16",
    startDate: "2026-10-15",
    endDate: "2026-10-16",
  });
  assert.equal(body.summary.taskCounts.total, 3);
  assert.equal(body.summary.filters.taskScope, "selectedDateRange");
});

test("goal counts, progress, overdue and due-soon are correct", async () => {
  const { body } = await call({ today: "2026-10-16" });
  const g = body.summary.goalCounts;
  assert.deepEqual(g, {
    total: 5,
    active: 2,
    completed: 1,
    onHold: 1,
    notStarted: 1,
    overdue: 1,
    dueSoon: 1,
  });
  const byTitle = Object.fromEntries(body.summary.goals.map((x) => [x.title, x.progress]));
  assert.equal(byTitle.Linked, 50);
  assert.equal(byTitle.Measured, 40);
  assert.equal(body.summary.averageActiveGoalProgress, 45);
});

test("invalid parameters are rejected", async () => {
  assert.equal((await call({ today: "16-10-2026" })).statusCode, 400);
  assert.equal((await call({ startDate: "2026-10-20", endDate: "2026-10-01" })).statusCode, 400);
});
