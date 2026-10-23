import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Square, Timer, Trash2 } from "lucide-react";

import {
  getErrorMessage,
  getFocusSessions,
  getTasks,
  logFocusSession,
  removeFocusSession,
} from "../../api.js";
import { formatHours, toDateString, addDays } from "../../utils/date.js";
import { ErrorMessage, SuccessMessage } from "../common/Feedback.jsx";
import Select from "../common/Select.jsx";

const STORAGE_KEY = "progressily_focus_timer";
const PRESETS = [
  { label: "25 / 5", focus: 25, rest: 5 },
  { label: "50 / 10", focus: 50, rest: 10 },
  { label: "90 / 15", focus: 90, rest: 15 },
];
const IDLE = {
  status: "idle",
  mode: "focus",
  durationSec: 25 * 60,
  startedAt: 0,
  elapsedMs: 0,
  sessionStart: 0,
  taskId: "",
};

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored && typeof stored === "object" ? { ...IDLE, ...stored } : IDLE;
  } catch {
    return IDLE;
  }
}

const pad = (value) => String(value).padStart(2, "0");
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(Math.floor(seconds % 60))}`;

export default function FocusTimer() {
  const [timer, setTimer] = useState(loadState);
  const [now, setNow] = useState(0);
  const [preset, setPreset] = useState(0);
  const [custom, setCustom] = useState(30);
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const finishing = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch {
      /* ignore */
    }
  }, [timer]);

  const elapsedMs = timer.elapsedMs + (timer.status === "running" ? now - timer.startedAt : 0);
  const totalMs = timer.durationSec * 1000;
  const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

  const loadSessions = useCallback(async () => {
    try {
      const today = toDateString();
      const [taskRecords, sessionRecords] = await Promise.all([
        getTasks({ date: today }),
        getFocusSessions({ startDate: addDays(today, -6), endDate: today }),
      ]);
      setTasks(taskRecords.filter((task) => task.status !== "Completed"));
      setSessions(sessionRecords);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, []);

  useEffect(() => {
    // Fetching data is an external synchronization; loadSessions manages async state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (timer.status !== "running") return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer.status]);

  useEffect(() => {
    const previous = document.title;
    document.title =
      timer.status === "idle"
        ? previous
        : `${clock(remainingSec)} · ${timer.mode === "focus" ? "Focus" : "Break"}`;
    return () => {
      document.title = previous;
    };
  }, [remainingSec, timer.status, timer.mode]);

  const finish = useCallback(
    async (save = true) => {
      if (finishing.current) return;
      finishing.current = true;
      const endedAt = Date.now();
      const spent = Math.min(
        timer.elapsedMs + (timer.status === "running" ? endedAt - timer.startedAt : 0),
        timer.durationSec * 1000,
      );
      const snapshot = timer;
      setTimer({
        ...IDLE,
        durationSec: snapshot.durationSec,
        mode: snapshot.mode,
        taskId: snapshot.taskId,
      });

      try {
        if (save && spent >= 60 * 1000) {
          await logFocusSession({
            taskId: snapshot.mode === "focus" && snapshot.taskId ? snapshot.taskId : undefined,
            type: snapshot.mode,
            startedAt: new Date(endedAt - spent).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
          });
          setNotice(
            `${snapshot.mode === "focus" ? "Focus" : "Break"} session saved (${Math.round(spent / 60000)} min).`,
          );
          await loadSessions();
        } else if (save) {
          setNotice("Session was shorter than 1 minute, so it wasn't saved.");
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError, "Could not save the session."));
      } finally {
        finishing.current = false;
      }
    },
    [timer, loadSessions],
  );

  useEffect(() => {
    if (timer.status === "running" && remainingSec === 0) {
      // Finishing the timer persists the completed session as an external action.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      finish(true);
    }
  }, [remainingSec, timer.status, finish]);

  function start() {
    setError("");
    setNotice("");
    const startedAt = Date.now();
    setNow(startedAt);
    setTimer((current) => ({
      ...current,
      status: "running",
      startedAt,
      sessionStart: current.sessionStart || startedAt,
    }));
  }

  function pause() {
    const stamp = Date.now();
    setTimer((current) => ({
      ...current,
      status: "paused",
      elapsedMs: current.elapsedMs + (stamp - current.startedAt),
      startedAt: 0,
    }));
  }

  function reset() {
    setTimer((current) => ({
      ...IDLE,
      durationSec: current.durationSec,
      mode: current.mode,
      taskId: current.taskId,
    }));
  }

  function choose(mode, minutes) {
    if (timer.status !== "idle") return;
    setTimer((current) => ({ ...current, mode, durationSec: Math.round(minutes * 60) }));
  }

  const active = PRESETS[preset];
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, elapsedMs / totalMs);

  const stats = useMemo(() => {
    const today = toDateString();
    const focusOnly = sessions.filter((session) => session.type === "focus");
    const sum = (list) =>
      Math.round(list.reduce((total, session) => total + session.durationMinutes, 0));
    return {
      today: sum(
        focusOnly.filter((session) => toDateString(new Date(session.startedAt)) === today),
      ),
      week: sum(focusOnly),
      todaySessions: sessions.filter(
        (session) => toDateString(new Date(session.startedAt)) === today,
      ),
    };
  }, [sessions]);

  async function deleteSession(id) {
    try {
      await removeFocusSession(id);
      await loadSessions();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <h1>Focus Timer</h1>
          <p>Work in focused blocks and track your deep-work time.</p>
        </div>
      </div>

      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{notice}</SuccessMessage>

      <section
        className="metrics planner-metrics"
        style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}
      >
        <article className="metric">
          <div>
            <label>Focus today</label>
            <strong>{formatHours(stats.today)}</strong>
            <p>{stats.todaySessions.filter((s) => s.type === "focus").length} sessions</p>
          </div>
          <span className="icon-box green">
            <Timer size={23} />
          </span>
        </article>
        <article className="metric">
          <div>
            <label>Last 7 days</label>
            <strong>{formatHours(stats.week)}</strong>
            <p>Tracked focus time</p>
          </div>
          <span className="icon-box blue">
            <Timer size={23} />
          </span>
        </article>
        <article className="metric">
          <div>
            <label>Current mode</label>
            <strong>{timer.mode === "focus" ? "Focus" : "Break"}</strong>
            <p>{Math.round(timer.durationSec / 60)} minutes</p>
          </div>
          <span className="icon-box purple">
            <Timer size={23} />
          </span>
        </article>
      </section>

      <div className="pi-focus-layout">
        <section className="panel pi-timer-card">
          <div
            className="period-switch"
            role="tablist"
            aria-label="Timer mode"
            style={{ alignSelf: "center" }}
          >
            {["focus", "break"].map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={timer.mode === mode}
                className={timer.mode === mode ? "selected" : ""}
                disabled={timer.status !== "idle"}
                onClick={() => choose(mode, mode === "focus" ? active.focus : active.rest)}
              >
                {mode === "focus" ? "Focus" : "Break"}
              </button>
            ))}
          </div>

          <div
            className="pi-ring"
            role="timer"
            aria-live="off"
            aria-label={`${clock(remainingSec)} remaining`}
          >
            <svg viewBox="0 0 240 240" width="260" height="260" aria-hidden="true">
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="var(--grid)"
                strokeWidth="12"
              />
              <circle
                cx="120"
                cy="120"
                r={radius}
                fill="none"
                stroke="#07865c"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                transform="rotate(-90 120 120)"
              />
            </svg>
            <div className="pi-ring-label">
              <strong>{clock(remainingSec)}</strong>
              <span>
                {timer.status === "idle"
                  ? "Ready"
                  : timer.status === "paused"
                    ? "Paused"
                    : timer.mode === "focus"
                      ? "Stay focused"
                      : "Take a break"}
              </span>
            </div>
          </div>

          <div className="pi-timer-controls">
            {timer.status === "running" ? (
              <button type="button" className="primary-btn" onClick={pause}>
                <Pause size={18} /> Pause
              </button>
            ) : (
              <button type="button" className="primary-btn" onClick={start}>
                <Play size={18} /> {timer.status === "paused" ? "Resume" : "Start"}
              </button>
            )}
            <button
              type="button"
              className="secondary-btn"
              onClick={() => finish(true)}
              disabled={timer.status === "idle"}
            >
              <Square size={16} /> Finish &amp; save
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={reset}
              disabled={timer.status === "idle"}
            >
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <div className="pi-presets" role="group" aria-label="Presets">
            {PRESETS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                className={preset === index ? "active" : ""}
                disabled={timer.status !== "idle"}
                onClick={() => {
                  setPreset(index);
                  choose(timer.mode, timer.mode === "focus" ? item.focus : item.rest);
                }}
              >
                {item.label}
              </button>
            ))}
            <label className="pi-custom">
              <span>Custom</span>
              <input
                type="number"
                min={1}
                max={180}
                value={custom}
                disabled={timer.status !== "idle"}
                onChange={(event) => setCustom(event.target.value)}
                onBlur={() => {
                  const minutes = Math.max(1, Math.min(180, Number(custom) || 25));
                  setCustom(minutes);
                  choose(timer.mode, minutes);
                }}
                aria-label="Custom minutes"
              />
              <span>min</span>
            </label>
          </div>

          <label className="field" style={{ width: "min(360px,100%)" }}>
            Working on (optional)
            <Select
              value={timer.taskId}
              disabled={timer.status !== "idle" || timer.mode === "break"}
              onChange={(event) =>
                setTimer((current) => ({ ...current, taskId: event.target.value }))
              }
            >
              <option value="">No specific task</option>
              {tasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.title}
                </option>
              ))}
            </Select>
          </label>
        </section>

        <section className="panel" style={{ padding: 18 }}>
          <div className="panel-heading">
            <h2>Today's sessions</h2>
          </div>
          {stats.todaySessions.length === 0 ? (
            <p className="pi-muted">No sessions yet today. Start the timer to log one.</p>
          ) : (
            <ul className="pi-session-list">
              {stats.todaySessions.map((session) => (
                <li key={session._id}>
                  <span className={`badge ${session.type === "focus" ? "completed" : "pending"}`}>
                    {session.type}
                  </span>
                  <span>
                    {new Date(session.startedAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    · {Math.round(session.durationMinutes)} min
                    {session.type === "focus" && <small> · {session.category}</small>}
                  </span>
                  <button
                    type="button"
                    className="pi-icon-btn"
                    aria-label="Delete session"
                    onClick={() => deleteSession(session._id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
