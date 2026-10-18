export default function Badge({ children, tone }) {
  const className = tone || String(children).toLowerCase().replaceAll(" ", "-");
  return <span className={`badge ${className}`}>{children}</span>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const categoryTone = (category) => `cat-${String(category || "personal").toLowerCase()}`;
