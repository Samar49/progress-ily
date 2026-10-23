import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

// Drop-in replacement for <select>: same <option> children and the same
// onChange(event) contract (event.target.name / event.target.value), but the
// menu is a themed glass panel instead of the browser's plain native list.
function parseOptions(children) {
  const items = [];
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const label = Children.toArray(child.props.children).join("");
    const value = child.props.value !== undefined ? String(child.props.value) : label;
    items.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return items;
}

export default function Select({
  name,
  value,
  onChange,
  disabled = false,
  children,
  className = "",
  "aria-label": ariaLabel,
}) {
  const options = useMemo(() => parseOptions(children), [children]);
  const current = options.find((option) => option.value === String(value ?? ""));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 200, up: false });
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const uid = useId();

  const place = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = Math.min(280, options.length * 40 + 12);
    const up = window.innerHeight - rect.bottom < height + 16 && rect.top > height + 16;
    setPos({
      left: rect.left,
      top: up ? rect.top - 6 : rect.bottom + 6,
      width: Math.max(rect.width, 160),
      up,
    });
  }, [options.length]);

  const close = useCallback(() => setOpen(false), []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const index = options.findIndex((option) => option.value === String(value ?? ""));
    setActive(index >= 0 ? index : 0);
    place();
    setOpen(true);
  }, [disabled, options, value, place]);

  const choose = useCallback(
    (option) => {
      if (!option || option.disabled) return;
      onChange?.({ target: { name, value: option.value } });
      setOpen(false);
      buttonRef.current?.focus();
    },
    [onChange, name],
  );

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (buttonRef.current?.contains(event.target) || listRef.current?.contains(event.target))
        return;
      setOpen(false);
    }
    function onScroll(event) {
      if (listRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  useEffect(() => {
    if (open)
      listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(event) {
    if (disabled) return;
    const { key } = event;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      event.stopPropagation(); // don't also close a surrounding dialog
      close();
    } else if (key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (key === "End") {
      event.preventDefault();
      setActive(options.length - 1);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      choose(options[active]);
    } else if (key === "Tab") {
      close();
    } else if (key.length === 1) {
      const index = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(key.toLowerCase()),
      );
      if (index >= 0) setActive(index);
    }
  }

  const host =
    typeof document !== "undefined" ? document.querySelector(".app") || document.body : null;

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        className={`pi-select-btn ${open ? "open" : ""} ${className}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? uid : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span>{current ? current.label : "Select..."}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open &&
        host &&
        createPortal(
          <ul
            id={uid}
            ref={listRef}
            role="listbox"
            className="pi-select-list"
            style={{
              left: pos.left,
              width: pos.width,
              ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
            }}
          >
            {options.map((option, index) => {
              const selected = option.value === String(value ?? "");
              return (
                <li
                  key={`${option.value}-${index}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={option.disabled || undefined}
                  data-active={index === active}
                  className={`pi-select-option ${selected ? "selected" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span>{option.label}</span>
                  {selected && <Check size={15} aria-hidden="true" />}
                </li>
              );
            })}
          </ul>,
          host,
        )}
    </>
  );
}
