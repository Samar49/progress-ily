import { useId, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Moon,
  ShieldCheck,
  Sprout,
  Sun,
  Timer,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { signIn, signUp } from "../api.js";
import "../styles.css";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Organize your day",
    text: "Tasks, goals and calendar in one place",
  },
  {
    icon: Timer,
    title: "Stay focused",
    text: "Built-in focus timer for deep work",
  },
  {
    icon: TrendingUp,
    title: "Track your progress",
    text: "Visual analytics to keep you motivated",
  },
  {
    icon: ShieldCheck,
    title: "Build better habits",
    text: "Turn your goals into a lifestyle",
  },
];

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function AuthPage({ onAuthenticated, theme, setTheme }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const uid = useId();
  const isRegistering = mode === "register";

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
  }

  // Social login and password reset need backend support that does not exist yet.
  function showComingSoon(feature) {
    setError("");
    setNotice(`${feature} isn't available yet. Please use your email and password.`);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        setError("Please enter your name.");
        return;
      }

      if (name.trim().length > 80) {
        setError("Your name cannot exceed 80 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Your passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegistering) {
        await signUp(name.trim(), normalizedEmail, password);
      }

      const user = await signIn(normalizedEmail, password);
      onAuthenticated(user);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ax-shell">
      {theme && setTheme && (
        <button
          type="button"
          className={`theme-toggle ax-theme pi-theme-${theme}`}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Current: ${theme} mode`}
        >
          <Sun size={16} className="pi-theme-icon pi-sun" />
          <span className="toggle" style={{ justifyContent: theme === "light" ? "flex-start" : "flex-end" }}>
            <i />
          </span>
          <Moon size={16} className="pi-theme-icon pi-moon" />
        </button>
      )}

      <section className="ax-hero" aria-label="About Progress.ily">
        <div className="ax-hero-content">
          <div className="ax-logo">
            <span className="ax-logo-mark">
              <Sprout size={20} aria-hidden="true" />
            </span>
            <span>Progress.ily</span>
          </div>

          <h1 className="ax-headline">
            <span>Small</span>
            <span>Steps</span>
            <span className="ax-accent">Big Progress.</span>
          </h1>

          <p className="ax-tagline">
            Plan smarter, stay focused, and become a better you — every day.
          </p>

          <ul className="ax-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="ax-feature-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>{text}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="ax-quote">
          <Sprout size={18} aria-hidden="true" />
          <span>“A little progress each day adds up to big results.”</span>
        </p>
      </section>

      <section className="ax-panel">
        <div className="ax-card">
          <header className="ax-card-head">
            <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
            <p>
              {isRegistering
                ? "Start turning your goals into daily progress."
                : "Sign in to continue your journey"}
            </p>
          </header>

          {error && (
            <div className="ax-error" role="alert">
              {error}
            </div>
          )}

          {notice && (
            <div className="ax-notice" role="status">
              {notice}
            </div>
          )}

          <form className="ax-form" onSubmit={handleSubmit}>
            {isRegistering && (
              <div className="ax-field">
                <label htmlFor={`${uid}-name`}>Full name</label>
                <div className="ax-input">
                  <UserRound size={18} aria-hidden="true" />
                  <input
                    id={`${uid}-name`}
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    maxLength={80}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="ax-field">
              <label htmlFor={`${uid}-email`}>Email</label>
              <div className="ax-input">
                <Mail size={18} aria-hidden="true" />
                <input
                  id={`${uid}-email`}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="ax-field">
              <label htmlFor={`${uid}-password`}>Password</label>
              <div className="ax-input">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id={`${uid}-password`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isRegistering
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  autoComplete={
                    isRegistering ? "new-password" : "current-password"
                  }
                  minLength={8}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="ax-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {!isRegistering && (
              <div className="ax-forgot">
                <button
                  type="button"
                  className="ax-link"
                  onClick={() => showComingSoon("Password reset")}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {isRegistering && (
              <div className="ax-field">
                <label htmlFor={`${uid}-confirm`}>Confirm password</label>
                <div className="ax-input">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    id={`${uid}-confirm`}
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="ax-submit" disabled={loading}>
              {loading ? (
                "Please wait..."
              ) : (
                <>
                  {isRegistering ? "Create account" : "Sign in"}
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="ax-switch">
            {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="ax-link"
              onClick={() => changeMode(isRegistering ? "login" : "register")}
              disabled={loading}
            >
              {isRegistering ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}