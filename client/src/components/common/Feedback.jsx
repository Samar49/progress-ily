import { AlertCircle, CheckCircle2 } from "lucide-react";

export function ErrorMessage({ children, onRetry }) {
  if (!children) return null;
  return (
    <div className="pi-alert pi-alert-error" role="alert">
      <AlertCircle size={17} aria-hidden="true" />
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function SuccessMessage({ children }) {
  if (!children) return null;
  return (
    <div className="pi-alert pi-alert-success" role="status">
      <CheckCircle2 size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="pi-empty">
      {Icon && <Icon size={28} aria-hidden="true" />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 90, count = 1 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="pi-skeleton" style={{ height }} />
      ))}
    </div>
  );
}
