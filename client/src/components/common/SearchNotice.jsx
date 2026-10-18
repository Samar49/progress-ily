import { Search, X } from "lucide-react";

// Shown whenever the header search is filtering the page, so a leftover
// search term can never hide data without the user noticing.
export default function SearchNotice({ term, onClear }) {
  if (!term || !term.trim()) return null;
  return (
    <div className="pi-alert pi-alert-info" role="status">
      <Search size={16} aria-hidden="true" />
      <span>
        Showing results for <b>"{term.trim()}"</b>
      </span>
      <button type="button" onClick={onClear}>
        <X size={14} style={{ verticalAlign: "middle" }} /> Clear search
      </button>
    </div>
  );
}
