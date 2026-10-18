import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Themed pop-over rendered in the .app element (so it inherits light/dark
// variables) and positioned next to its trigger. Closes on outside click,
// scroll, resize and Escape.
export default function FloatingPanel({ anchorRef, open, onClose, children, width = 300, className = "", label }) {
  const panelRef = useRef(null);
  const [style, setStyle] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      // Clear stale positioning when the panel closes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStyle(null);
      return;
    }
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const height = panelRef.current?.offsetHeight || 340;
    const spaceBelow = window.innerHeight - anchor.bottom;
    const up = spaceBelow < height + 14 && anchor.top > spaceBelow;
    const panelWidth = Math.max(width, Math.min(anchor.width, 360));
    const left = Math.max(10, Math.min(anchor.left, window.innerWidth - panelWidth - 10));
    setStyle({
      left,
      width: panelWidth,
      ...(up ? { bottom: window.innerHeight - anchor.top + 6 } : { top: anchor.bottom + 6 }),
    });
  }, [open, anchorRef, width]);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(event) {
      if (anchorRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      onClose();
    }
    function onScroll(event) {
      if (panelRef.current?.contains(event.target)) return;
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;
  const host = document.querySelector(".app") || document.body;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      className={`pi-float ${className}`}
      style={style || { visibility: "hidden", top: 0, left: 0, width }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation(); // keep a surrounding dialog open
          onClose();
          anchorRef.current?.focus();
        }
      }}
    >
      {children}
    </div>,
    host
  );
}
