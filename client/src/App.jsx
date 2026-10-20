import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import AuthPage from "./components/AuthPage.jsx";
import TaskFormModal from "./components/planner/TaskFormModal.jsx";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import DailyPlanner from "./components/planner/DailyPlanner.jsx";
import GoalsPage from "./components/GoalsPage.jsx";
import { Skeleton } from "./components/common/Feedback.jsx";

import { getStoredUser, signOut } from "./api.js";
import { TaskDialogContext, useScrollLock, useTheme } from "./hooks.js";

import "./styles.css";
import "./extra.css";
import "./glass.css";
import "./responsive.css";
import "./polish.css";

// Less-used pages are loaded on demand to keep the first bundle small.
const AnalyticsPage = lazy(() => import("./components/AnalyticsPage.jsx"));
const CalendarPage = lazy(() => import("./components/pages/CalendarPage.jsx"));
const FocusTimer = lazy(() => import("./components/pages/FocusTimer.jsx"));
const SettingsPage = lazy(() => import("./components/pages/SettingsPage.jsx"));
const HelpPage = lazy(() => import("./components/pages/HelpPage.jsx"));

function NotFound() {
  const navigate = useNavigate();
  return (
    <main className="content">
      <section className="panel pi-empty" style={{ padding: 40 }}>
        <h1>Page not found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <button type="button" className="primary-btn" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </section>
    </main>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, preference, setPreference } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(() => getStoredUser());
  const [dialog, setDialog] = useState(null); // { task, defaults }
  const [navOpen, setNavOpen] = useState(false); // mobile menu drawer
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const background = theme === "dark" ? "#0e1722" : "#fff";
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.background = background;
    document.body.style.background = background;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0e1722" : "#f7f9f7");
  }, [theme]);

  // When the page changes, reset page-level UI during render (React's recommended
  // way to adjust state on a change, instead of setState inside an effect):
  // a search typed on one page must not silently hide data on the next, and the
  // mobile menu should close after navigating.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setSearchTerm("");
    setNavOpen(false);
  }

  // Close the mobile menu on Escape and lock page scroll while it is open.

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (event) => event.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);
  useScrollLock(navOpen);

  const clearSearch = useCallback(() => setSearchTerm(""), []);

  const resetSession = useCallback(() => {
    setUser(null);
    setSearchTerm("");
    setDialog(null);
    navigate("/", { replace: true });
  }, [navigate]);

  const handleAuthenticated = useCallback(
    (authenticatedUser) => {
      setUser(authenticatedUser);
      setSearchTerm("");
      navigate("/dashboard", { replace: true });
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    signOut();
    resetSession();
  }, [resetSession]);

  useEffect(() => {
    window.addEventListener("progressily:unauthorized", resetSession);
    return () => window.removeEventListener("progressily:unauthorized", resetSession);
  }, [resetSession]);

  const taskDialog = useMemo(
    () => ({
      version,
      openTaskDialog: (task = null, defaults = null) => setDialog({ task, defaults }),
    }),
    [version]
  );

  if (!user) {
    return (
      <div className={`app theme-${theme}`}>
        <AuthPage onAuthenticated={handleAuthenticated} theme={theme} setTheme={setPreference} />
      </div>
    );
  }

  return (
    <TaskDialogContext.Provider value={taskDialog}>
      <div className={`app theme-${theme}`}>
        <a href="#main" className="pi-skip-link">
          Skip to content
        </a>
        <Sidebar user={user} onLogout={handleLogout} open={navOpen} onClose={() => setNavOpen(false)} />
        <div className={`pi-nav-overlay ${navOpen ? "show" : ""}`} onClick={() => setNavOpen(false)} aria-hidden="true" />

        <div className="main-shell" id="main">
          <Header onMenu={() => setNavOpen(true)} theme={theme} setTheme={setPreference} user={user} onSearch={setSearchTerm} searchValue={searchTerm} refreshKey={version} />

          <Suspense
            fallback={
              <main className="content">
                <Skeleton height={120} count={3} />
              </main>
            }
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard user={user} searchTerm={searchTerm} onClearSearch={clearSearch} />} />
              <Route path="/planner" element={<DailyPlanner searchTerm={searchTerm} onClearSearch={clearSearch} user={user} />} />
              <Route path="/goals" element={<GoalsPage searchTerm={searchTerm} onClearSearch={clearSearch} />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/focus" element={<FocusTimer />} />
              <Route
                path="/settings"
                element={
                  <SettingsPage
                    user={user}
                    onUserChange={setUser}
                    theme={preference}
                    setTheme={setPreference}
                    onAccountDeleted={handleLogout}
                  />
                }
              />
              <Route path="/help" element={<HelpPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          <footer className="footer">
            <span>© 2026 Progress.ily</span>
            <span>Made with Love❤️ by SAMAR</span>
            <span>Your progress is personal.</span>
          </footer>
        </div>

        {dialog && (
          <TaskFormModal
            task={dialog.task}
            defaults={dialog.defaults}
            onClose={() => setDialog(null)}
            onSaved={() => {
              setSearchTerm("");
              setVersion((value) => value + 1);
            }}
          />
        )}
      </div>
    </TaskDialogContext.Provider>
  );
}