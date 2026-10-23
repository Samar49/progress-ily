import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { WEEKDAYS, fromDateString, monthGrid, toDateString } from "../../utils/date.js";

export default function MiniCalendar({ selected, onSelect }) {
  const base = fromDateString(selected);
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });

  useEffect(() => {
    const date = fromDateString(selected);
    // Keep the calendar month aligned when the selected day changes externally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }, [selected]);

  function shift(delta) {
    const date = new Date(view.year, view.month + delta, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }

  const title = new Date(view.year, view.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
  const today = toDateString();

  return (
    <section className="panel mini-calendar">
      <div className="panel-heading">
        <h3>{title}</h3>
        <div>
          <button
            type="button"
            className="plain-icon"
            onClick={() => shift(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            className="plain-icon"
            onClick={() => shift(1)}
            aria-label="Next month"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
        {monthGrid(view.year, view.month).map((cell) => (
          <button
            type="button"
            key={cell.date}
            onClick={() => onSelect(cell.date)}
            className={`pi-mini-day ${cell.inMonth ? "" : "faded"} ${cell.date === selected ? "selected" : ""} ${cell.date === today ? "today" : ""}`}
            aria-label={cell.date}
            aria-pressed={cell.date === selected}
          >
            {cell.day}
          </button>
        ))}
      </div>
    </section>
  );
}
