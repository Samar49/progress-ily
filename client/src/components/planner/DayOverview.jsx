import { CheckCircle2, Clock3 } from "lucide-react";

import { CATEGORY_COLORS } from "../../constants.js";
import { formatHours, formatTime12, taskMinutes } from "../../utils/date.js";

// Compact summary shown beside the mini calendar.
export default function DayOverview({ tasks, title = "Overview" }) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "Completed").length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const minutes = tasks.reduce((sum, task) => sum + taskMinutes(task), 0);

  const upNext = tasks
    .filter((task) => task.status !== "Completed")
    .sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"))[0];

  const byCategory = {};
  for (const task of tasks) byCategory[task.category] = (byCategory[task.category] || 0) + 1;
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <section className="panel pi-overview">
      <div className="panel-heading">
        <h3>{title}</h3>
        <small>{percent}% done</small>
      </div>

      <div className="progress-track" role="progressbar" aria-label="Completed tasks" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="pi-overview-line">
        <CheckCircle2 size={15} aria-hidden="true" /> {done} of {total} tasks completed
      </p>
      <p className="pi-overview-line">
        <Clock3 size={15} aria-hidden="true" /> {formatHours(minutes)} planned
      </p>

      <div className="pi-overview-next">
        <small>Up next</small>
        {upNext ? (
          <>
            <b>{upNext.title}</b>
            <span>{upNext.startTime ? `${formatTime12(upNext.startTime)}${upNext.endTime ? ` – ${formatTime12(upNext.endTime)}` : ""}` : "No time set"}</span>
          </>
        ) : (
          <b>{total ? "All done 🎉" : "Nothing planned yet"}</b>
        )}
      </div>

      {categories.length > 0 && (
        <div className="pi-overview-cats">
          {categories.map(([name, count]) => (
            <span key={name}>
              <i style={{ background: CATEGORY_COLORS[name] || "#94a3b8" }} />
              {name}
              <b>{count}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}