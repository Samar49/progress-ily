import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Search,
  Target,
  Zap,
} from "lucide-react";

import { addTask, editTask, getErrorMessage, getTasks, removeTask } from "../../api.js";
import { CATEGORIES, PRIORITIES } from "../../constants.js";
import { useLocalStorageState, useTaskDialog } from "../../hooks.js";
import {
  WEEKDAYS,
  addDays,
  apiDateToString,
  formatHours,
  formatLong,
  formatTime12,
  fromDateString,
  monthGrid,
  startOfWeek,
  taskMinutes,
  toDateString,
} from "../../utils/date.js";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { ErrorMessage, Skeleton, SuccessMessage } from "../common/Feedback.jsx";
import SearchNotice from "../common/SearchNotice.jsx";
import MiniCalendar from "./MiniCalendar.jsx";
import MonthGrid from "./MonthGrid.jsx";
import DayOverview from "./DayOverview.jsx";
import TaskTable, { normalizeTask } from "./TaskTable.jsx";
import Select from "../common/Select.jsx";
import DatePicker from "../common/DatePicker.jsx";
import TimePicker from "../common/TimePicker.jsx";

const VIEWS = ["Day", "Week", "Month"];

function rangeFor(view, selectedDate) {
  if (view === "Day") return { date: selectedDate };
  if (view === "Week") {
    const start = startOfWeek(selectedDate);
    return { startDate: start, endDate: addDays(start, 6) };
  }
  const base = fromDateString(selectedDate);
  const cells = monthGrid(base.getFullYear(), base.getMonth());
  return { startDate: cells[0].date, endDate: cells[cells.length - 1].date };
}

function groupByDate(tasks) {
  const grouped = {};
  for (const task of tasks) {
    const day = apiDateToString(task.date);
    (grouped[day] ||= []).push(task);
  }
  return grouped;
}

function MetricTile({ tone, icon: Icon, value, label, caption, captionClass }) {
  return (
    <article className={`metric tinted ${tone}`}>
      <span
        className={`icon-box ${tone === "mint" ? "green" : tone === "lilac" ? "purple" : tone === "blush" ? "red" : "blue"}`}
      >
        <Icon size={25} aria-hidden="true" />
      </span>
      <div>
        <strong>{value}</strong>
        <label>{label}</label>
        <p className={captionClass}>{caption}</p>
      </div>
    </article>
  );
}

export default function DailyPlanner({ searchTerm = "", onClearSearch, user }) {
  const { openTaskDialog, version } = useTaskDialog();

  const [view, setView] = useLocalStorageState(
    "progressily_planner_view",
    user?.preferences?.defaultView || "Day",
  );
  const [selectedDate, setSelectedDate] = useState(toDateString());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState("All");
  const [localSearch, setLocalSearch] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const records = await getTasks(rangeFor(view, selectedDate));
      setTasks(records.map(normalizeTask));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load tasks."));
    } finally {
      setLoading(false);
    }
  }, [view, selectedDate]);

  useEffect(() => {
    // Fetching data is an external synchronization; load manages async state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const query = `${searchTerm} ${localSearch}`.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (category !== "All" && task.category !== category) return false;
        if (!query) return true;
        return [task.title, task.category, task.priority, task.status, task.notes].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        );
      }),
    [tasks, category, query],
  );

  const stats = useMemo(() => {
    const done = tasks.filter((task) => task.status === "Completed").length;
    const minutes = tasks.reduce((sum, task) => sum + taskMinutes(task), 0);
    return {
      total: tasks.length,
      done,
      remaining: tasks.length - done,
      minutes,
      high: tasks.filter((task) => task.priority === "High" && task.status !== "Completed").length,
    };
  }, [tasks]);

  const usedCategories = useMemo(() => [...new Set(tasks.map((task) => task.category))], [tasks]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  async function toggle(task) {
    setBusyId(task.id);
    setError("");
    try {
      const reopening = task.status === "Completed";
      await editTask(task.id, { status: reopening ? "Pending" : "Completed" });
      flash(reopening ? "Task reopened." : "Task marked as completed.");
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!confirming) return;
    setDeleting(true);
    try {
      await removeTask(confirming.id);
      setConfirming(null);
      flash("Task deleted.");
      await load();
    } catch (requestError) {
      setConfirming(null);
      setError(getErrorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  }

  const step = view === "Day" ? 1 : view === "Week" ? 7 : 0;
  function shift(direction) {
    if (view === "Month") {
      const base = fromDateString(selectedDate);
      setSelectedDate(
        toDateString(new Date(base.getFullYear(), base.getMonth() + direction, 1, 12)),
      );
    } else {
      setSelectedDate(addDays(selectedDate, direction * step));
    }
  }

  const label =
    view === "Day"
      ? formatLong(selectedDate)
      : view === "Week"
        ? `${fromDateString(startOfWeek(selectedDate)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${fromDateString(addDays(startOfWeek(selectedDate), 6)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
        : fromDateString(selectedDate).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          });

  const periodWord = view === "Day" ? "Today's" : view === "Week" ? "This week's" : "This month's";
  const byDate = useMemo(() => groupByDate(filtered), [filtered]);
  const base = fromDateString(selectedDate);

  return (
    <main className="content planner-page">
      <div className="page-title">
        <div>
          <h1>Daily Planner</h1>
          <p>Plan your day, stay consistent.</p>
        </div>
      </div>

      <div className="planner-toolbar">
        <div className="date-controls" role="group" aria-label="Change date">
          <button
            type="button"
            className="square-btn"
            onClick={() => shift(-1)}
            aria-label={`Previous ${view.toLowerCase()}`}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="date-label">
            <CalendarDays size={17} aria-hidden="true" />
            <b>{label}</b>
          </span>
          <button
            type="button"
            className="square-btn"
            onClick={() => shift(1)}
            aria-label={`Next ${view.toLowerCase()}`}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="today-btn"
            onClick={() => setSelectedDate(toDateString())}
          >
            Today
          </button>
        </div>

        <div className="period-switch" role="tablist" aria-label="Planner view">
          {VIEWS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={view === item}
              key={item}
              className={view === item ? "selected" : ""}
              onClick={() => setView(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={() => openTaskDialog(null, { date: selectedDate })}
        >
          <Plus size={19} /> Add Task
        </button>
      </div>

      <section className="metrics planner-metrics">
        <MetricTile
          tone="mint"
          icon={CalendarDays}
          value={stats.total}
          label="Tasks Scheduled"
          caption={`${stats.done} completed · ${stats.remaining} remaining`}
        />
        <MetricTile
          tone="lilac"
          icon={Clock3}
          value={formatHours(stats.minutes)}
          label="Planned Focus Time"
          caption={
            view === "Day"
              ? `~${Math.round((stats.minutes / 480) * 100)}% of an 8h day`
              : `${periodWord} total`
          }
        />
        <MetricTile
          tone="blush"
          icon={Target}
          value={stats.high}
          label="High Priority Tasks"
          caption={stats.high ? "Stay on track!" : "Nothing urgent"}
        />
        <MetricTile
          tone="ice"
          icon={CheckCircle2}
          value={stats.done}
          label="Tasks Completed"
          caption={stats.done ? "Great progress! 🎉" : "Let's get started"}
        />
      </section>

      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      <SuccessMessage>{notice}</SuccessMessage>
      <SearchNotice term={searchTerm} onClear={onClearSearch} />

      <div className="planner-columns">
        <div className="planner-main">
          {view === "Month" && (
            <section className="panel tasks-card" style={{ paddingBottom: 16 }}>
              <div className="panel-heading">
                <h2>{label}</h2>
              </div>
              {loading && !tasks.length ? (
                <Skeleton height={320} />
              ) : (
                <MonthGrid
                  year={base.getFullYear()}
                  month={base.getMonth()}
                  tasksByDate={byDate}
                  selected={selectedDate}
                  onSelect={(day) => {
                    setSelectedDate(day);
                    setView("Day");
                  }}
                />
              )}
            </section>
          )}

          {view === "Week" && (
            <section className="panel tasks-card" style={{ paddingBottom: 16 }}>
              <div className="panel-heading">
                <h2>Week overview</h2>
              </div>
              {loading && !tasks.length ? (
                <Skeleton height={240} />
              ) : (
                <div className="pi-week">
                  {WEEKDAYS.map((name, index) => {
                    const day = addDays(startOfWeek(selectedDate), index);
                    const items = byDate[day] || [];
                    return (
                      <div
                        key={day}
                        className={`pi-week-col ${day === toDateString() ? "today" : ""}`}
                      >
                        <button
                          type="button"
                          className="pi-week-head"
                          onClick={() => {
                            setSelectedDate(day);
                            setView("Day");
                          }}
                        >
                          <span>{name}</span>
                          <b>{fromDateString(day).getDate()}</b>
                        </button>
                        {items.length === 0 && <small className="pi-muted">No tasks</small>}
                        {items.map((task) => (
                          <button
                            type="button"
                            key={task.id}
                            className={`pi-week-task ${task.status === "Completed" ? "done" : ""}`}
                            onClick={() => openTaskDialog(task)}
                            title={task.title}
                          >
                            <small>{formatTime12(task.startTime) || "Anytime"}</small>
                            {task.title}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {view === "Day" && (
            <section className="panel tasks-card">
              <div className="panel-heading">
                <h2>{selectedDate === toDateString() ? "Today's Tasks" : "Tasks"}</h2>
                <label className="table-search">
                  <Search size={15} aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search tasks..."
                    aria-label="Search tasks on this day"
                    value={localSearch}
                    onChange={(event) => setLocalSearch(event.target.value)}
                  />
                </label>
              </div>

              <div className="filters" role="group" aria-label="Filter by category">
                {["All", ...usedCategories].map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                  >
                    {item}
                  </button>
                ))}
                {(category !== "All" || localSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory("All");
                      setLocalSearch("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {loading && !tasks.length ? (
                <Skeleton height={60} count={4} />
              ) : (
                <TaskTable
                  tasks={filtered}
                  onToggle={toggle}
                  onEdit={(task) => openTaskDialog(task)}
                  onDelete={(task) => setConfirming(task)}
                  busyId={busyId}
                  emptyText={
                    tasks.length
                      ? "No tasks match your filters."
                      : "No tasks for this day yet. Add one below."
                  }
                />
              )}
            </section>
          )}

          <QuickAdd
            date={selectedDate}
            defaultCategory={user?.preferences?.defaultCategory}
            onAdded={() => {
              onClearSearch?.();
              flash("Task added.");
              load();
            }}
            onError={setError}
          />
        </div>

        <aside className="planner-aside">
          <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
          <DayOverview
            tasks={tasks}
            title={
              view === "Day" ? "Day Overview" : view === "Week" ? "Week Overview" : "Month Overview"
            }
          />
        </aside>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${confirming.title}" will be permanently deleted. This cannot be undone.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirming(null)}
        />
      )}
    </main>
  );
}

function QuickAdd({ date, defaultCategory, onAdded, onError }) {
  const [form, setForm] = useState({
    title: "",
    date,
    startTime: "",
    endTime: "",
    category: CATEGORIES.includes(defaultCategory) ? defaultCategory : "Personal",
    priority: "Medium",
  });
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    // Keep the quick-add form date aligned with the planner selection.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({ ...current, date }));
  }, [date]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setLocalError("");
    onError("");
    if (!form.title.trim()) return setLocalError("Enter a task title.");
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      return setLocalError("End time must be later than start time.");
    }
    setSaving(true);
    try {
      await addTask({ ...form, title: form.title.trim() });
      setForm((current) => ({ ...current, title: "", startTime: "", endTime: "" }));
      onAdded();
    } catch (requestError) {
      setLocalError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel quick-add">
      <div className="quick-heading">
        <span className="icon-box green">
          <Zap size={22} aria-hidden="true" />
        </span>
        <div>
          <h3>Quick Add Task</h3>
          <p>Add a new task in seconds</p>
        </div>
      </div>
      {localError && (
        <p className="pi-field-error" role="alert">
          {localError}
        </p>
      )}
      <form className="pi-quick-form" onSubmit={submit} noValidate>
        <label className="field pi-q-title">
          <span className="pi-sr-only">Task title</span>
          <input
            name="title"
            placeholder="Task title..."
            value={form.title}
            onChange={update}
            maxLength={150}
          />
        </label>
        <label className="field">
          Category
          <Select name="category" value={form.category} onChange={update}>
            {CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </label>
        <label className="field">
          Priority
          <Select name="priority" value={form.priority} onChange={update}>
            {PRIORITIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </label>
        <label className="field">
          Date
          <DatePicker name="date" value={form.date} onChange={update} />
        </label>
        <label className="field">
          Start
          <TimePicker name="startTime" value={form.startTime} onChange={update} />
        </label>
        <label className="field">
          End
          <TimePicker name="endTime" value={form.endTime} onChange={update} />
        </label>
        <button type="submit" className="primary-btn pi-q-submit" disabled={saving}>
          <Plus size={18} /> {saving ? "Adding..." : "Add Task"}
        </button>
      </form>
    </section>
  );
}
