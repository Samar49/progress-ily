import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Bell, Sun, Moon, X, CalendarClock, Flag, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getGoals, getTasks } from "../api.js";
import { addDays, apiDateToString, formatShort, toDateString } from "../utils/date.js";

export default function Header({
  theme,
  setTheme,
  user,
  onSearch,
  onMenu,
  searchValue = "",
  refreshKey,
}) {
  const search = searchValue;
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === "Escape") {
        searchRef.current?.blur();
        setOpen(false);
      }
    }
    function onClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Notifications are derived from real data: overdue / due-today tasks
  // and goals due within a week.
  useEffect(() => {
    let active = true;
    const today = toDateString();
    Promise.all([
      getTasks({ startDate: addDays(today, -14), endDate: addDays(today, 1) }),
      getGoals(),
    ])
      .then(([tasks, goals]) => {
        if (!active) return;
        const items = [];
        for (const task of tasks) {
          if (task.status === "Completed") continue;
          const day = apiDateToString(task.date);
          if (day < today)
            items.push({
              key: task._id,
              type: "task",
              text: `Overdue: ${task.title}`,
              meta: formatShort(day),
              to: "/planner",
            });
          else if (day === today)
            items.push({
              key: task._id,
              type: "task",
              text: `Due today: ${task.title}`,
              meta: task.startTime || "Today",
              to: "/planner",
            });
        }
        const weekAhead = addDays(today, 7);
        for (const goal of goals) {
          if (goal.status === "Completed") continue;
          const day = apiDateToString(goal.targetDate);
          if (day >= today && day <= weekAhead) {
            items.push({
              key: goal.id,
              type: "goal",
              text: `Goal due soon: ${goal.title}`,
              meta: formatShort(day),
              to: "/goals",
            });
          }
        }
        setNotes(items.slice(0, 8));
      })
      .catch(() => active && setNotes([]));
    return () => {
      active = false;
    };
  }, [refreshKey, user?.id]);

  const hasNotes = useMemo(() => notes.length > 0, [notes]);

  function handleChange(event) {
    onSearch?.(event.target.value);
  }

  function clearSearch() {
    onSearch?.("");
    searchRef.current?.focus();
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="pi-icon-btn pi-menu-btn"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <form className="global-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label="Search tasks and goals"
          placeholder="Search tasks, goals..."
          value={search}
          onChange={handleChange}
          className="pi-search-input"
        />
        {search ? (
          <button
            type="button"
            className="pi-icon-btn"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <X size={15} />
          </button>
        ) : null}
      </form>

      <div className="topbar-actions pi-topbar-actions">
        <button
          type="button"
          className={`theme-toggle pi-theme-${theme}`}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Current: ${theme} mode`}
        >
          <Sun size={16} className="pi-theme-icon pi-sun" />
          <span
            className="toggle"
            style={{ justifyContent: theme === "light" ? "flex-start" : "flex-end" }}
          >
            <i />
          </span>
          <Moon size={16} className="pi-theme-icon pi-moon" />
        </button>

        <div className="pi-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="icon-button"
            aria-label={hasNotes ? `Notifications (${notes.length})` : "Notifications"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Bell size={20} />
            {hasNotes && <i aria-hidden="true" />}
          </button>

          {open && (
            <div className="pi-dropdown" role="menu">
              <h4>Notifications</h4>
              {hasNotes ? (
                notes.map((note) => (
                  <button
                    key={`${note.type}-${note.key}`}
                    type="button"
                    role="menuitem"
                    className="pi-note"
                    onClick={() => {
                      setOpen(false);
                      navigate(note.to);
                    }}
                  >
                    {note.type === "goal" ? <Flag size={16} /> : <CalendarClock size={16} />}
                    <span>
                      <b>{note.text}</b>
                      <small>{note.meta}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p className="pi-note-empty">You're all caught up!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
