import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useScrollLock } from "../../hooks.js";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = 480,
  labelledBy = "modal-title",
}) {
  const ref = useRef(null);
  useScrollLock(true); // the page behind the dialog must not scroll
  // Keep the latest onClose without re-running the focus effect below.
  // (Parents pass a new function on every render, which used to re-focus the
  // first field after each keystroke.)
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const first = node?.querySelector("input,select,textarea") || node?.querySelector(FOCUSABLE);
    first?.focus();

    function onKey(event) {
      if (event.key === "Escape") {
        closeRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  // Rendered at the app root so the blurred backdrop covers the sidebar,
  // top bar and footer too (page content has its own stacking layer).
  const host = document.querySelector(".app") || document.body;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}
    >
      <div
        className="modal pi-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        ref={ref}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
        <h2 id={labelledBy}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </div>,
    host,
  );
}
