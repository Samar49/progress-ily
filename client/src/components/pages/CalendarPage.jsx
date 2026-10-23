import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { getErrorMessage, getGoals, getTasks } from "../../api.js";
import { CATEGORY_COLORS } from "../../constants.js";
import { useTaskDialog } from "../../hooks.js";
import {
  apiDateToString,
  formatLong,
  fromDateString,
  monthGrid,
  toDateString,
} from "../../utils/date.js";
import { ErrorMessage, Skeleton } from "../common/Feedback.jsx";
import MonthGrid from "../planner/MonthGrid.jsx";
import TaskTable, { normalizeTask } from "../planner/TaskTable.jsx";

export default function CalendarPage() {
  const { openTaskDialog, version } = useTaskDialog();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState(toDateString());
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cells = monthGrid(cursor.year, cursor.month);
      const [taskRecords, goalRecords] = await Promise.all([
        getTasks({ startDate: cells[0].date, endDate: cells[cells.length - 1].date }),
        getGoals(),
      ]);
      setTasks(taskRecords.map(normalizeTask));
      setGoals(goalRecords);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load the calendar."));
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    // Fetching data is an external synchronization; load manages async state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const tasksByDate = useMemo(() => {
    const grouped = {};
    for (const task of tasks) (grouped[apiDateToString(task.date)] ||= []).push(task);
    return grouped;
  }, [tasks]);

  const goalsByDate = useMemo(() => {
    const grouped = {};
    for (const goal of goals) {
      if (goal.status === "Completed") continue;
      (grouped[apiDateToString(goal.targetDate)] ||= []).push(goal.title);
    }
    return grouped;
  }, [goals]);

  function shift(delta) {
    const date = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: date.getFullYear(), month: date.getMonth() });
  }

  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const dayTasks = tasksByDate[selected] || [];
  const dayGoals = goalsByDate[selected] || [];

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <h1>Calendar</h1>
          <p>See your tasks and goal deadlines at a glance.</p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => openTaskDialog(null, { date: selected })}
        >
          <Plus size={19} /> Add Task
        </button>
      </div>

      <ErrorMessage onRetry={load}>{error}</ErrorMessage>

      <div className="pi-calendar-layout">
        <section className="panel" style={{ padding: 16 }}>
          <div className="panel-heading">
            <h2>{title}</h2>
            <div className="date-controls">
              <button
                type="button"
                className="square-btn"
                onClick={() => shift(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="today-btn"
                style={{ borderRadius: 0, margin: 0 }}
                onClick={() => {
                  const now = new Date();
                  setCursor({ year: now.getFullYear(), month: now.getMonth() });
                  setSelected(toDateString());
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="square-btn"
                style={{ borderRadius: "0 10px 10px 0" }}
                onClick={() => shift(1)}
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          {loading && !tasks.length ? (
            <Skeleton height={380} />
          ) : (
            <MonthGrid
              year={cursor.year}
              month={cursor.month}
              tasksByDate={tasksByDate}
              extrasByDate={goalsByDate}
              selected={selected}
              onSelect={setSelected}
            />
          )}
          <div className="legend" style={{ marginTop: 12, flexWrap: "wrap" }}>
            {Object.entries(CATEGORY_COLORS)
              .slice(0, 6)
              .map(([name, color]) => (
                <span key={name}>
                  <i
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color,
                      display: "inline-block",
                    }}
                  />{" "}
                  {name}
                </span>
              ))}
            <span>🎯 Goal deadline</span>
          </div>
        </section>

        <aside className="panel" style={{ padding: 16, alignSelf: "start" }}>
          <div className="panel-heading">
            <h2>{formatLong(selected)}</h2>
          </div>
          {dayGoals.map((goal) => (
            <p key={goal} className="pi-goal-due">
              🎯 Goal due: <b>{goal}</b>
            </p>
          ))}
          <TaskTable tasks={dayTasks} compact emptyText="No tasks on this day." />
          <button
            type="button"
            className="secondary-btn"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => openTaskDialog(null, { date: selected })}
          >
            <Plus size={16} style={{ verticalAlign: "middle" }} /> Add task for{" "}
            {fromDateString(selected).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </button>
        </aside>
      </div>
    </main>
  );
}
