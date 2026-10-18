import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { WEEKDAYS, addDays, formatShort, fromDateString, monthGrid, toDateString } from "../../utils/date.js";
import FloatingPanel from "./FloatingPanel.jsx";

export default function DatePicker({ name, value, onChange, min, max, clearable = false, disabled = false, id, placeholder = "Select date", "aria-label": ariaLabel }) {
  const anchorRef = useRef(null);
  const gridRef = useRef(null);
  const [open, setOpen] = useState(false);
  const base = fromDateString(value || toDateString());
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });
  const [focusDate, setFocusDate] = useState(value || toDateString());

  const today = toDateString();
  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    if (disabled) return;
    if (!open) {
      const date = fromDateString(value || today);
      setView({ year: date.getFullYear(), month: date.getMonth() });
      setFocusDate(value || today);
    }
    setOpen((current) => !current);
  }

  const cells = useMemo(() => monthGrid(view.year, view.month), [view]);
  const blocked = (day) => (min && day < min) || (max && day > max);

  function pick(day) {
    if (blocked(day)) return;
    onChange?.({ target: { name, value: day } });
    setOpen(false);
    anchorRef.current?.focus();
  }

  function shiftMonth(delta) {
    const date = new Date(view.year, view.month + delta, 1);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  }

  useEffect(() => {
    if (open) gridRef.current?.querySelector(`[data-date="${focusDate}"]`)?.focus();
  }, [open, focusDate, view]);

  function onGridKey(event) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      const next = addDays(focusDate, moves[event.key]);
      const date = fromDateString(next);
      setView({ year: date.getFullYear(), month: date.getMonth() });
      setFocusDate(next);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      const date = fromDateString(focusDate);
      date.setMonth(date.getMonth() + (event.key === "PageDown" ? 1 : -1));
      const next = toDateString(date);
      setView({ year: date.getFullYear(), month: date.getMonth() });
      setFocusDate(next);
    }
  }

  const title = new Date(view.year, view.month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <button
        type="button"
        id={id}
        ref={anchorRef}
        className={`pi-select-btn pi-picker-btn ${open ? "open" : ""}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <span className={value ? "" : "pi-placeholder"}>{value ? formatShort(value) : placeholder}</span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>

      <FloatingPanel anchorRef={anchorRef} open={open} onClose={close} width={296} label="Choose a date" className="pi-datepanel">
        <div className="pi-dp-head">
          <button type="button" className="pi-icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
          <b>{title}</b>
          <button type="button" className="pi-icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button>
        </div>
        <div className="pi-dp-grid" ref={gridRef} onKeyDown={onGridKey} role="grid">
          {WEEKDAYS.map((day) => (
            <span key={day} className="pi-dp-week" role="columnheader">{day.slice(0, 2)}</span>
          ))}
          {cells.map((cell) => (
            <button
              type="button"
              key={cell.date}
              data-date={cell.date}
              tabIndex={cell.date === focusDate ? 0 : -1}
              disabled={blocked(cell.date)}
              aria-label={formatShort(cell.date)}
              aria-pressed={cell.date === value}
              className={`pi-dp-day ${cell.inMonth ? "" : "faded"} ${cell.date === value ? "selected" : ""} ${cell.date === today ? "today" : ""}`}
              onClick={() => pick(cell.date)}
            >
              {cell.day}
            </button>
          ))}
        </div>
        <div className="pi-dp-foot">
          {clearable && value ? (
            <button type="button" onClick={() => { onChange?.({ target: { name, value: "" } }); setOpen(false); }}>Clear</button>
          ) : <span />}
          <button type="button" onClick={() => pick(today)} disabled={blocked(today)}>Today</button>
        </div>
      </FloatingPanel>
    </>
  );
}
