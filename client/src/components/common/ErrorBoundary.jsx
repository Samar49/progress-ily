import { Component } from "react";

// Catches rendering errors anywhere below it and shows a recovery screen
// instead of a blank white page.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center", fontFamily: "DM Sans, system-ui, sans-serif", color: "#0b1738" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: "Manrope, sans-serif", margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#647895", margin: "0 0 20px" }}>An unexpected error occurred. Your data is safe. Reload to continue.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 10, background: "#07865c", color: "#fff", fontWeight: 700, padding: "12px 24px", cursor: "pointer" }}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
