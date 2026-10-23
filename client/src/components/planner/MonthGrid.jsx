import { WEEKDAYS, monthGrid, toDateString } from "../../utils/date.js";
import { CATEGORY_COLORS } from "../../constants.js";

// Full-size month view shared by the Planner (Month tab) and Calendar page.
export default function MonthGrid({
  year,
  month,
  tasksByDate = {},
  extrasByDate = {},
  selected,
  onSelect,
}) {
  const today = toDateString();
  const cells = monthGrid(year, month);

  return (
    <div className="pi-month" role="grid" aria-label="Month view">
      {WEEKDAYS.map((day) => (
        <div key={day} className="pi-month-head" role="columnheader">
          {day}
        </div>
      ))}
      {cells.map((cell) => {
        const tasks = tasksByDate[cell.date] || [];
        const extras = extrasByDate[cell.date] || [];
        const done = tasks.filter((task) => task.status === "Completed").length;
        const classes = ["pi-month-cell"];
        if (!cell.inMonth) classes.push("faded");
        if (cell.date === today) classes.push("today");
        if (cell.date === selected) classes.push("selected");

        return (
          <button
            type="button"
            key={cell.date}
            role="gridcell"
            className={classes.join(" ")}
            onClick={() => onSelect?.(cell.date)}
            aria-label={`${cell.date}: ${tasks.length} tasks${extras.length ? `, ${extras.length} goal deadlines` : ""}`}
          >
            <span className="pi-day-num">{cell.day}</span>
            {tasks.slice(0, 2).map((task) => (
              <span
                key={task._id || task.id}
                className="pi-chip"
                style={{ borderColor: CATEGORY_COLORS[task.category] || "#94a3b8" }}
              >
                {task.title}
              </span>
            ))}
            {tasks.length > 2 && <span className="pi-more">+{tasks.length - 2} more</span>}
            {extras.slice(0, 1).map((extra) => (
              <span key={extra} className="pi-chip pi-chip-goal">
                🎯 {extra}
              </span>
            ))}
            {tasks.length > 0 && (
              <span className="pi-day-count">
                {done}/{tasks.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
