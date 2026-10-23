import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Plus,
  Target,
  FileText,
  CalendarCheck,
  Flag,
  Leaf,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getFocusSummary, getGoals, getTasks, getErrorMessage } from "../../api.js";
import { useTaskDialog } from "../../hooks.js";
import { CATEGORY_COLORS, QUOTES } from "../../constants.js";
import {
  WEEKDAYS,
  addDays,
  apiDateToString,
  formatHours,
  formatLong,
  formatShort,
  startOfWeek,
  taskMinutes,
  toDateString,
} from "../../utils/date.js";
import Badge from "../common/Badge.jsx";
import { EmptyState, ErrorMessage, Skeleton } from "../common/Feedback.jsx";
import SearchNotice from "../common/SearchNotice.jsx";
import TaskTable, { normalizeTask } from "../planner/TaskTable.jsx";
import { editTask } from "../../api.js";

function Metric({ title, value, sub, subTone, icon: Icon, tone, children }) {
  return (
    <article className="metric">
      <div style={{ minWidth: 0, flex: 1 }}>
        <label>{title}</label>
        <strong>{value}</strong>
        <p className={subTone}>{sub}</p>
        {children}
      </div>
      {Icon && (
        <span className={`icon-box ${tone}`}>
          <Icon size={23} aria-hidden="true" />
        </span>
      )}
    </article>
  );
}

function Donut({ percent }) {
  const data = [{ value: percent }, { value: 100 - percent }];
  return (
    <div style={{ width: 70, height: 70, flexShrink: 0 }} aria-hidden="true">
      <PieChart width={70} height={70}>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={24}
          outerRadius={34}
          startAngle={90}
          endAngle={-270}
          stroke="none"
        >
          <Cell fill="#07865c" />
          <Cell fill="rgba(120,160,150,0.28)" />
        </Pie>
      </PieChart>
    </div>
  );
}

const compareDelta = (today, yesterday, suffix = "") => {
  const diff = today - yesterday;
  if (diff === 0) return { text: `No change from yesterday`, tone: "" };
  return {
    text: `${diff > 0 ? "↑ +" : "↓ "}${Number.isInteger(diff) ? diff : diff.toFixed(1)}${suffix} from yesterday`,
    tone: diff > 0 ? "positive" : "",
  };
};

export default function Dashboard({ user, searchTerm = "", onClearSearch }) {
  const navigate = useNavigate();
  const { openTaskDialog, version } = useTaskDialog();

  const [selectedDate, setSelectedDate] = useState(toDateString());
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [focus, setFocus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const weekStart = startOfWeek(selectedDate);
      const [taskRecords, goalRecords, focusSummary] = await Promise.all([
        getTasks({ startDate: addDays(weekStart, -7), endDate: addDays(weekStart, 13) }),
        getGoals(),
        getFocusSummary({ startDate: weekStart, endDate: addDays(weekStart, 6) }).catch(() => null),
      ]);
      setTasks(taskRecords.map(normalizeTask));
      setGoals(goalRecords);
      setFocus(focusSummary);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load dashboard data."));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    // Fetching data is an external synchronization; load manages async state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const data = useMemo(() => {
    const dayOf = (task) => apiDateToString(task.date);
    const yesterday = addDays(selectedDate, -1);
    const todays = tasks.filter((task) => dayOf(task) === selectedDate);
    const prev = tasks.filter((task) => dayOf(task) === yesterday);
    const done = todays.filter((task) => task.status === "Completed").length;
    const percent = todays.length ? Math.round((done / todays.length) * 100) : 0;

    const focusPerDay = new Map((focus?.perDay || []).map((entry) => [entry.date, entry.minutes]));
    const hasFocus = (focus?.sessionCount || 0) > 0;
    // Tracked focus sessions are preferred; completed-task time is the fallback.
    const minutesFor = (day) =>
      hasFocus
        ? focusPerDay.get(day) || 0
        : tasks
            .filter((task) => dayOf(task) === day && task.status === "Completed")
            .reduce((sum, task) => sum + taskMinutes(task), 0);

    const weekStart = startOfWeek(selectedDate);
    const week = WEEKDAYS.map((label, index) => {
      const day = addDays(weekStart, index);
      const dayTasks = tasks.filter((task) => dayOf(task) === day);
      const completed = dayTasks.filter((task) => task.status === "Completed").length;
      return {
        label,
        date: day,
        completed,
        pending: dayTasks.length - completed,
        hours: Math.round((minutesFor(day) / 60) * 10) / 10,
      };
    });

    const byCategory = {};
    for (const entry of focus?.perCategory || []) byCategory[entry.name] = entry.minutes;
    if (!hasFocus) {
      for (const task of tasks) {
        if (task.status !== "Completed") continue;
        const day = dayOf(task);
        if (day < weekStart || day > addDays(weekStart, 6)) continue;
        byCategory[task.category] = (byCategory[task.category] || 0) + taskMinutes(task);
      }
    }
    const totalCategoryMinutes = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
    const distribution = Object.entries(byCategory)
      .filter(([, minutes]) => minutes > 0)
      .map(([name, minutes]) => ({
        name,
        minutes,
        percent: Math.round((minutes / totalCategoryMinutes) * 100),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const deadlines = [
      ...tasks
        .filter((task) => task.status !== "Completed" && dayOf(task) >= selectedDate)
        .map((task) => ({
          id: `t-${task.id}`,
          title: task.title,
          date: dayOf(task),
          badge: task.priority,
          kind: "task",
        })),
      ...goals
        .filter(
          (goal) => goal.status !== "Completed" && apiDateToString(goal.targetDate) >= selectedDate,
        )
        .map((goal) => ({
          id: `g-${goal.id}`,
          title: goal.title,
          date: apiDateToString(goal.targetDate),
          badge: "Goal",
          kind: "goal",
        })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);

    return {
      todays,
      done,
      percent,
      totalDelta: compareDelta(todays.length, prev.length),
      focusMinutes: minutesFor(selectedDate),
      focusDelta: compareDelta(minutesFor(selectedDate) / 60, minutesFor(yesterday) / 60, "h"),
      focusLabel: hasFocus ? "Focus Time" : "Planned Focus Time",
      week,
      weekFocusMax: Math.max(...week.map((entry) => entry.hours), 1),
      distribution,
      totalCategoryMinutes,
      deadlines,
      hasFocus,
    };
  }, [tasks, goals, focus, selectedDate]);

  const activeGoals = goals.filter(
    (goal) => goal.status === "Active" || goal.status === "Not Started",
  );
  const goalsDone = goals.filter((goal) => goal.status === "Completed").length;
  const goalsPercent = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0;

  const query = searchTerm.trim().toLowerCase();
  const visibleTasks = data.todays.filter(
    (task) =>
      !query ||
      [task.title, task.category, task.notes].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
  );

  async function toggle(task) {
    setBusyId(task.id);
    try {
      await editTask(task.id, { status: task.status === "Completed" ? "Pending" : "Completed" });
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  const isToday = selectedDate === toDateString();
  const quote = QUOTES[new Date(`${selectedDate}T12:00:00`).getDate() % QUOTES.length];

  return (
    <main className="content">
      <div className="page-title">
        <section className="welcome" style={{ margin: 0 }}>
          <h1>
            {greeting}
            {firstName ? `, ${firstName}!` : "!"}{" "}
            <span className="sun-emoji" aria-hidden="true">
              ☀️
            </span>
          </h1>
          <p>Small steps today, big progress tomorrow.</p>
        </section>

        <div className="pi-title-actions">
          <div className="date-controls" role="group" aria-label="Select date">
            <button
              type="button"
              className="square-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              aria-label="Previous day"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="date-label"
              onClick={() => setSelectedDate(toDateString())}
              title="Jump to today"
            >
              <b>{formatLong(selectedDate)}</b>
            </button>
            <button
              type="button"
              className="square-btn"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              aria-label="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            type="button"
            className="primary-btn"
            onClick={() => openTaskDialog(null, { date: selectedDate })}
          >
            <Plus size={18} /> Add Task
          </button>
        </div>
      </div>

      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      <SearchNotice term={searchTerm} onClear={onClearSearch} />

      {loading && !tasks.length ? (
        <Skeleton height={110} count={3} />
      ) : (
        <>
          <section className="metrics four">
            <Metric
              title={isToday ? "Today's Progress" : "Day Progress"}
              value={`${data.percent}%`}
              sub={`${data.done} of ${data.todays.length} tasks completed`}
            >
              <span className="pi-metric-donut">
                <Donut percent={data.percent} />
              </span>
            </Metric>
            <Metric
              title="Total Tasks"
              value={data.todays.length}
              sub={data.totalDelta.text}
              subTone={data.totalDelta.tone}
              icon={ListTodo}
              tone="green"
            />
            <Metric
              title={data.focusLabel}
              value={formatHours(data.focusMinutes)}
              sub={data.focusDelta.text}
              subTone={data.focusDelta.tone}
              icon={Clock3}
              tone="blue"
            />
            <Metric
              title="Goals Progress"
              value={`${goalsDone} / ${goals.length}`}
              sub={goals.length ? `${goalsPercent}% of goals completed` : "No goals yet"}
              icon={Target}
              tone="purple"
            >
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Goals completed"
                aria-valuenow={goalsPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${goalsPercent}%` }} />
              </div>
            </Metric>
          </section>

          <section className="chart-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <h3>Task Completion Trend</h3>
                <span className="select-like">This Week</span>
              </div>
              <div
                className="chart"
                role="img"
                aria-label="Completed and pending tasks per day this week"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.week} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--grid)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                    />
                    <Tooltip cursor={{ fill: "rgba(7,134,92,.06)" }} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      stackId="a"
                      fill="#07865c"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      stackId="a"
                      fill="var(--border)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="legend centered">
                <span>
                  <i className="green-dot" /> Completed
                </span>
                <span>
                  <i className="gray-dot" /> Pending
                </span>
              </div>
            </div>

            <div className="panel chart-panel">
              <div className="panel-heading">
                <h3>Time Distribution</h3>
                <span className="select-like">This Week</span>
              </div>
              {data.distribution.length ? (
                <div className="pie-wrap">
                  <div className="pie" role="img" aria-label="Time spent by category this week">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.distribution}
                          dataKey="minutes"
                          innerRadius="62%"
                          outerRadius="92%"
                          stroke="none"
                        >
                          {data.distribution.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={CATEGORY_COLORS[entry.name] || "#94a3b8"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center">
                      <strong>{formatHours(data.totalCategoryMinutes)}</strong>
                      <span>Total</span>
                    </div>
                  </div>
                  <div className="distribution-legend">
                    {data.distribution.slice(0, 5).map((entry) => (
                      <div key={entry.name}>
                        <i style={{ background: CATEGORY_COLORS[entry.name] || "#94a3b8" }} />
                        {entry.name}
                        <b>{entry.percent}%</b>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No time tracked yet"
                  text="Complete timed tasks or use the Focus Timer."
                />
              )}
            </div>

            <div className="panel chart-panel">
              <div className="panel-heading">
                <h3>Weekly Focus Hours</h3>
                <span className="select-like">This Week</span>
              </div>
              <div className="chart" role="img" aria-label="Focus hours per day this week">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.week} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="focusFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#07865c" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#07865c" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--grid)" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip formatter={(value) => [`${value}h`, "Focus"]} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      stroke="#07865c"
                      strokeWidth={2}
                      fill="url(#focusFill)"
                      dot={{ r: 3, fill: "#07865c" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="dashboard-lower">
            <div className="panel task-panel">
              <div className="panel-heading">
                <h2>{isToday ? "Today's Tasks" : "Tasks"}</h2>
                <button type="button" className="text-link" onClick={() => navigate("/planner")}>
                  View all →
                </button>
              </div>
              <TaskTable
                tasks={visibleTasks}
                compact
                onToggle={toggle}
                busyId={busyId}
                emptyText={
                  query ? "No tasks match your search." : "No tasks scheduled for this day."
                }
              />
            </div>

            <div className="panel deadlines">
              <div className="panel-heading">
                <h2>Upcoming Deadlines</h2>
                <button type="button" className="text-link" onClick={() => navigate("/calendar")}>
                  View all →
                </button>
              </div>
              {data.deadlines.length ? (
                data.deadlines.map((item) => (
                  <div className="deadline" key={item.id}>
                    <span className={`icon-box ${item.kind === "goal" ? "purple" : "red"}`}>
                      {item.kind === "goal" ? <Flag size={19} /> : <FileText size={19} />}
                    </span>
                    <div>
                      <b>{item.title}</b>
                      <small>{formatShort(item.date)}</small>
                    </div>
                    <Badge tone={item.badge === "Goal" ? "cat-global" : item.badge.toLowerCase()}>
                      {item.badge}
                    </Badge>
                  </div>
                ))
              ) : (
                <EmptyState icon={CalendarCheck} title="Nothing due soon" />
              )}
            </div>
          </section>

          <section className="panel active-goals" style={{ marginTop: 14 }}>
            <div className="panel-heading">
              <h2>Active Goals</h2>
              <button type="button" className="text-link" onClick={() => navigate("/goals")}>
                View all →
              </button>
            </div>
            <div className="goal-mini-grid">
              {activeGoals.slice(0, 4).map((goal) => (
                <article className="goal-mini" key={goal.id}>
                  <div className="mini-top">
                    <span className="icon-box green">
                      <Target size={19} />
                    </span>
                    <div>
                      <b>{goal.title}</b>
                      <small>{goal.description || goal.category}</small>
                    </div>
                  </div>
                  <div className="mini-progress">
                    <div className="progress-track">
                      <span style={{ width: `${goal.progress}%` }} />
                    </div>
                    <b>{goal.progress}%</b>
                  </div>
                  <small>
                    {goal.progressMode === "measurable"
                      ? `${goal.currentValue}/${goal.targetValue} ${goal.unit}`
                      : `${goal.completedTaskCount}/${goal.linkedTaskCount} tasks`}
                  </small>
                </article>
              ))}
              {!activeGoals.length && (
                <div style={{ gridColumn: "span 4" }}>
                  <EmptyState
                    icon={Target}
                    title="No active goals yet"
                    text="Create a goal to track longer-term progress."
                    action={
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={() => navigate("/goals")}
                      >
                        Create a goal
                      </button>
                    }
                  />
                </div>
              )}
              <aside className="quote-card" aria-label="Quote">
                <Leaf size={16} />
                <strong>“{quote}”</strong>
                <span className="mountains" aria-hidden="true">
                  ▲▲
                </span>
              </aside>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
