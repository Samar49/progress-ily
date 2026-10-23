import { useState } from "react";

import { changePassword, deleteAccount, getErrorMessage, updateProfile } from "../../api.js";
import { CATEGORIES } from "../../constants.js";
import { ErrorMessage, SuccessMessage } from "../common/Feedback.jsx";
import Select from "../common/Select.jsx";

function Section({ title, text, children }) {
  return (
    <section className="panel pi-settings-section">
      <div>
        <h2>{title}</h2>
        {text && <p className="pi-muted">{text}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function SettingsPage({ user, onUserChange, theme, setTheme, onAccountDeleted }) {
  const [name, setName] = useState(user?.name || "");
  const [category, setCategory] = useState(
    CATEGORIES.includes(user?.preferences?.defaultCategory)
      ? user.preferences.defaultCategory
      : "Personal",
  );
  const [view, setView] = useState(user?.preferences?.defaultView || "Day");
  const [profileMsg, setProfileMsg] = useState({ error: "", ok: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordMsg, setPasswordMsg] = useState({ error: "", ok: "" });
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmText, setConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMsg({ error: "", ok: "" });
    if (!name.trim()) return setProfileMsg({ error: "Name cannot be empty.", ok: "" });
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        preferences: { defaultCategory: category, defaultView: view },
      });
      onUserChange(updated);
      localStorage.setItem("progressily_planner_view", JSON.stringify(view));
      setProfileMsg({ error: "", ok: "Settings saved." });
    } catch (requestError) {
      setProfileMsg({ error: getErrorMessage(requestError), ok: "" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordMsg({ error: "", ok: "" });
    if (passwords.next.length < 8)
      return setPasswordMsg({ error: "New password must be at least 8 characters.", ok: "" });
    if (passwords.next !== passwords.confirm)
      return setPasswordMsg({ error: "New passwords do not match.", ok: "" });
    setSavingPassword(true);
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: "", next: "", confirm: "" });
      setPasswordMsg({ error: "", ok: "Password updated." });
    } catch (requestError) {
      setPasswordMsg({ error: getErrorMessage(requestError), ok: "" });
    } finally {
      setSavingPassword(false);
    }
  }

  async function removeAccount(event) {
    event.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      onAccountDeleted();
    } catch (requestError) {
      setDeleteError(getErrorMessage(requestError));
      setDeleting(false);
    }
  }

  return (
    <main className="content">
      <div className="page-title">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile and preferences.</p>
        </div>
      </div>

      <Section title="Profile & preferences" text="Your name and planner defaults.">
        <form className="pi-form" onSubmit={saveProfile} noValidate>
          <ErrorMessage>{profileMsg.error}</ErrorMessage>
          <SuccessMessage>{profileMsg.ok}</SuccessMessage>
          <label className="field">
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </label>
          <label className="field">
            Email
            <input value={user?.email || ""} readOnly aria-readonly="true" />
          </label>
          <div className="pi-grid-2">
            <label className="field">
              Default task category
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              Default planner view
              <Select value={view} onChange={(event) => setView(event.target.value)}>
                {["Day", "Week", "Month"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </label>
          </div>
          <label className="field">
            Theme
            <Select value={theme} onChange={(event) => setTheme(event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System (match device)</option>
            </Select>
          </label>
          <div>
            <button type="submit" className="primary-btn" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </Section>

      <Section title="Change password" text="Use at least 8 characters.">
        <form className="pi-form" onSubmit={savePassword} noValidate>
          <ErrorMessage>{passwordMsg.error}</ErrorMessage>
          <SuccessMessage>{passwordMsg.ok}</SuccessMessage>
          <label className="field">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
            />
          </label>
          <div className="pi-grid-2">
            <label className="field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.next}
                onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
              />
            </label>
            <label className="field">
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
              />
            </label>
          </div>
          <div>
            <button
              type="submit"
              className="primary-btn"
              disabled={savingPassword || !passwords.current}
            >
              {savingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </Section>

      <Section
        title="Delete account"
        text="Permanently removes your account, tasks, goals and focus sessions. This cannot be undone."
      >
        <form className="pi-form" onSubmit={removeAccount} noValidate>
          <ErrorMessage>{deleteError}</ErrorMessage>
          <label className="field">
            Type DELETE to confirm
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
            />
          </label>
          <div>
            <button
              type="submit"
              className="primary-btn pi-danger"
              disabled={deleting || confirmText !== "DELETE" || !deletePassword}
            >
              {deleting ? "Deleting..." : "Delete my account"}
            </button>
          </div>
        </form>
      </Section>
    </main>
  );
}
