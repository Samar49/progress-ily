import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3 } from "lucide-react";

import FloatingPanel from "./FloatingPanel.jsx";
import { formatTime12 } from "../../utils/date.js";

const pad = (number) => String(number).padStart(2, "0");
const HOURS = Array.from({ length: 12 }, (_, index) => pad(index + 1)); // 01 - 12
const PERIODS = ["AM", "PM"];
const COLUMNS = ["h", "m", "p"];

// Values are stored as 24h "HH:mm"; the picker shows and edits them in 12h AM/PM.
function split24(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return { hour: "", minute: "", period: "" };
  const [h, m] = value.split(":").map(Number);
  return { hour: pad(h % 12 || 12), minute: pad(m), period: h >= 12 ? "PM" : "AM" };
}

function join24(hour12, minute, period) {
  const h24 = (Number(hour12) % 12) + (period === "PM" ? 12 : 0);
  return `${pad(h24)}:${minute}`;
}

// Scrolls a column so the selected button sits in the middle (only the column moves, not the page).
function centerInColumn(button) {
  const column = button?.parentElement;
  if (!column) return;
  const offset =
    button.getBoundingClientRect().top -
    column.getBoundingClientRect().top -
    (column.clientHeight - button.clientHeight) / 2;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  column.scrollTo({ top: column.scrollTop + offset, behavior: reduce ? "auto" : "smooth" });
}

export default function TimePicker({
  name,
  value,
  onChange,
  disabled = false,
  id,
  placeholder = "--:-- --",
  "aria-label": ariaLabel,
}) {
  const anchorRef = useRef(null);
  const panelBodyRef = useRef(null);
  const scrollAfterChange = useRef(false);
  const [open, setOpen] = useState(false);

  const { hour, minute, period } = split24(value);
  const close = useCallback(() => setOpen(false), []);

  const steps = Array.from({ length: 12 }, (_, index) => pad(index * 5));
  const minutes = minute && !steps.includes(minute) ? [...steps, minute].sort() : steps;

  const scrollToSelected = useCallback(() => {
    panelBodyRef.current?.querySelectorAll("[data-selected='true']").forEach(centerInColumn);
  }, []);

  useEffect(() => {
    if (!open) return;
    scrollToSelected();
    (
      panelBodyRef.current?.querySelector("[data-selected='true']") ||
      panelBodyRef.current?.querySelector("button")
    )?.focus({ preventScroll: true });
  }, [open, scrollToSelected]);

  // "Now" changes the value while the panel is open, so scroll once the new selection has rendered.
  useEffect(() => {
    if (!open || !scrollAfterChange.current) return;
    scrollAfterChange.current = false;
    scrollToSelected();
  }, [value, open, scrollToSelected]);

  function emit(next) {
    onChange?.({ target: { name, value: next } });
  }

  function chooseHour(h) {
    emit(join24(h, minute || "00", period || split24(toNow()).period));
  }

  function chooseMinute(m) {
    const base = hour ? { hour, period } : split24(toNow());
    emit(join24(base.hour, m, base.period));
  }

  function choosePeriod(p) {
    const base = hour
      ? { hour, minute: minute || "00" }
      : { hour: split24(toNow()).hour, minute: "00" };
    emit(join24(base.hour, base.minute, p));
  }

  function toNow() {
    const now = new Date();
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  function setNow() {
    const now = new Date();
    const next = `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 5) * 5)}`;
    if (next === value) {
      scrollToSelected(); // already selected, so no re-render will happen
      return;
    }
    scrollAfterChange.current = true;
    emit(next);
  }

  function onKey(event, column, index) {
    const find = (col) => [...panelBodyRef.current.querySelectorAll(`[data-col="${col}"]`)];
    const buttons = find(column);
    const pickSelected = (col) =>
      find(col).find((node) => node.dataset.selected === "true") || find(col)[0];
    const at = COLUMNS.indexOf(column);
    let target = null;
    if (event.key === "ArrowDown") target = buttons[Math.min(buttons.length - 1, index + 1)];
    else if (event.key === "ArrowUp") target = buttons[Math.max(0, index - 1)];
    else if (event.key === "ArrowRight" && at < COLUMNS.length - 1)
      target = pickSelected(COLUMNS[at + 1]);
    else if (event.key === "ArrowLeft" && at > 0) target = pickSelected(COLUMNS[at - 1]);
    if (target) {
      event.preventDefault();
      target.focus();
    }
  }

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
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={value ? "" : "pi-placeholder"}>{formatTime12(value) || placeholder}</span>
        <Clock3 size={16} aria-hidden="true" />
      </button>

      <FloatingPanel
        anchorRef={anchorRef}
        open={open}
        onClose={close}
        width={230}
        label="Choose a time"
        className="pi-timepanel"
      >
        <div className="pi-tp-cols" ref={panelBodyRef}>
          <div className="pi-tp-col" role="listbox" aria-label="Hours">
            <span className="pi-tp-title">Hour</span>
            {HOURS.map((h, index) => (
              <button
                type="button"
                key={h}
                data-col="h"
                data-selected={h === hour}
                className={h === hour ? "selected" : ""}
                onClick={() => chooseHour(h)}
                onKeyDown={(event) => onKey(event, "h", index)}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="pi-tp-col" role="listbox" aria-label="Minutes">
            <span className="pi-tp-title">Min</span>
            {minutes.map((m, index) => (
              <button
                type="button"
                key={m}
                data-col="m"
                data-selected={m === minute}
                className={m === minute ? "selected" : ""}
                onClick={() => chooseMinute(m)}
                onKeyDown={(event) => onKey(event, "m", index)}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="pi-tp-col" role="listbox" aria-label="AM or PM">
            <span className="pi-tp-title">AM/PM</span>
            {PERIODS.map((p, index) => (
              <button
                type="button"
                key={p}
                data-col="p"
                data-selected={p === period}
                className={p === period ? "selected" : ""}
                onClick={() => choosePeriod(p)}
                onKeyDown={(event) => onKey(event, "p", index)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="pi-dp-foot">
          <button
            type="button"
            onClick={() => {
              emit("");
              close();
            }}
          >
            Clear
          </button>
          <button type="button" onClick={setNow}>
            Now
          </button>
          <button
            type="button"
            className="pi-done"
            onClick={() => {
              close();
              anchorRef.current?.focus();
            }}
          >
            Done
          </button>
        </div>
      </FloatingPanel>
    </>
  );
}
