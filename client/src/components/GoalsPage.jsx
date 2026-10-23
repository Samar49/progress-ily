import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  Code2,
  Dumbbell,
  Leaf,
  MoreVertical,
  Plus,
  Target,
  Trophy,
  Wallet,
  User,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { addGoal, editGoal, getErrorMessage, getGoals, removeGoal } from "../api.js";
import {
  GOAL_CATEGORIES,
  GOAL_CATEGORY_COLORS,
  GOAL_STATUSES,
  GOAL_STATUS_COLORS,
  GOAL_TERMS,
  QUOTES,
} from "../constants.js";
import { apiDateToString, formatShort, toDateString } from "../utils/date.js";
import ConfirmDialog from "./common/ConfirmDialog.jsx";
import { EmptyState, ErrorMessage, Skeleton, SuccessMessage } from "./common/Feedback.jsx";
import Modal from "./common/Modal.jsx";
import SearchNotice from "./common/SearchNotice.jsx";
import Select from "./common/Select.jsx";
import DatePicker from "./common/DatePicker.jsx";

const TABS = ["All", "Active", "Completed", "On Hold"];

const CATEGORY_ICON = {
  Career: [Briefcase, "purple"],
  "Skill Development": [Code2, "orange"],
  Health: [Dumbbell, "red"],
  Learning: [BookOpen, "blue"],
  Finance: [Wallet, "green"],
  Personal: [User, "green"],
  Other: [Target, "blue"],
};

const STATUS_BADGE = {
  Active: "completed",
  Completed: "completed",
  "On Hold": "medium",
  "Not Started": "pending",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Personal",
  term: "Medium Term",
  targetDate: "",
  status: "Active",
  progressMode: "tasks",
  manualProgress: 0,
  targetValue: "",
  currentValue: 0,
  unit: "",
};

function formFromGoal(goal) {
  return {
    title: goal.title || "",
    description: goal.description || "",
    category: GOAL_CATEGORIES.includes(goal.category) ? goal.category : "Personal",
    term: goal.term || "Medium Term",
    targetDate: apiDateToString(goal.targetDate),
    status: goal.status || "Active",
    progressMode: goal.progressMode || (goal.linkedTaskCount ? "tasks" : "manual"),
    manualProgress: goal.manualProgress || 0,
    targetValue: goal.targetValue || "",
    currentValue: goal.currentValue || 0,
    unit: goal.unit || "",
  };
}

function captionFor(goal) {
  if (goal.progressMode === "measurable") {
    return `${goal.currentValue}/${goal.targetValue} ${goal.unit}`.trim();
  }
  if (goal.progressMode === "manual") return "Manual progress";
  return `${goal.completedTaskCount}/${goal.linkedTaskCount} tasks`;
}

function Donut({ data, center, label }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);
  const chartData = total ? data : [{ name: "none", value: 1, color: "var(--border)" }];
  return (
    <div className="pie goal-pie" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" innerRadius="62%" outerRadius="94%" stroke="none">
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pie-center">
        <strong>{center.value}</strong>
        <span>{center.caption}</span>
      </div>
    </div>
  );
}

function GoalMenu({ goal, onEdit, onStatus, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="pi-menu-wrap" ref={ref}>
      <button
        type="button"
        className="pi-icon-btn"
        aria-label={`Actions for ${goal.title}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="pi-dropdown pi-dropdown-small" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit(goal);
            }}
          >
            Edit goal
          </button>
          {goal.status !== "Completed" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onStatus(goal, "Completed");
              }}
            >
              Mark completed
            </button>
          )}
          {goal.status !== "On Hold" && goal.status !== "Completed" && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onStatus(goal, "On Hold");
              }}
            >
              Put on hold
            </button>
          )}
          {(goal.status === "On Hold" || goal.status === "Completed") && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onStatus(goal, "Active");
              }}
            >
              Reactivate
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="danger"
            onClick={() => {
              setOpen(false);
              onDelete(goal);
            }}
          >
            Delete goal
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage({ searchTerm = "", onClearSearch }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("All");

  const [modal, setModal] = useState(null); // { goal | null }
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setGoals(await getGoals());
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load goals."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching data is an external synchronization; load manages async state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function flash(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }

  const visible = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = goals.filter((goal) => {
      if (tab !== "All" && goal.status !== tab) return false;
      if (!query) return true;
      return [goal.title, goal.description, goal.category].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
    return [...list].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
  }, [goals, tab, searchTerm]);

  const stats = useMemo(() => {
    const count = (status) => goals.filter((goal) => goal.status === status).length;
    const monthKey = toDateString().slice(0, 7);
    const open = goals.filter((goal) => goal.status !== "Completed");
    return {
      active: count("Active"),
      completed: count("Completed"),
      onHold: count("On Hold"),
      notStarted: count("Not Started"),
      overall: goals.length
        ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
        : 0,
      dueThisMonth: open.filter((goal) => apiDateToString(goal.targetDate).startsWith(monthKey))
        .length,
    };
  }, [goals]);

  const categoryData = useMemo(
    () =>
      GOAL_CATEGORIES.map((name) => ({
        name,
        value: goals.filter((goal) => goal.category === name).length,
        color: GOAL_CATEGORY_COLORS[name],
      })),
    [goals],
  );

  const milestones = useMemo(
    () =>
      goals
        .filter((goal) => goal.status !== "Completed")
        .sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate))
        .slice(0, 4),
    [goals],
  );

  function openCreate() {
    setForm({ ...EMPTY_FORM, targetDate: "" });
    setFormError("");
    setModal({ goal: null });
  }

  function openEdit(goal) {
    setForm(formFromGoal(goal));
    setFormError("");
    setModal({ goal });
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setFormError("");

    const title = form.title.trim();
    if (!title) return setFormError("Please enter a goal title.");
    if (!form.targetDate) return setFormError("Please choose a target date.");

    const payload = {
      title,
      description: form.description.trim(),
      category: form.category,
      term: form.term,
      targetDate: form.targetDate,
      status: form.status,
      progressMode: form.progressMode,
    };

    if (form.progressMode === "manual") {
      const value = Number(form.manualProgress);
      if (!Number.isFinite(value) || value < 0 || value > 100)
        return setFormError("Progress must be between 0 and 100.");
      payload.manualProgress = value;
    }
    if (form.progressMode === "measurable") {
      const target = Number(form.targetValue);
      const current = Number(form.currentValue);
      if (!(target > 0)) return setFormError("Enter a target value greater than 0.");
      if (!(current >= 0)) return setFormError("Current value cannot be negative.");
      payload.targetValue = target;
      payload.currentValue = current;
      payload.unit = form.unit.trim();
    }

    setSaving(true);
    try {
      if (modal.goal) {
        await editGoal(modal.goal.id, payload);
        flash("Goal updated.");
      } else {
        await addGoal(payload);
        flash("Goal created.");
      }
      setModal(null);
      await load();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(goal, status) {
    setError("");
    try {
      await editGoal(goal.id, { status });
      flash(`"${goal.title}" is now ${status}.`);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function confirmDelete() {
    setDeleteBusy(true);
    try {
      await removeGoal(deleting.id);
      setDeleting(null);
      flash("Goal deleted.");
      await load();
    } catch (requestError) {
      setDeleting(null);
      setError(getErrorMessage(requestError));
    } finally {
      setDeleteBusy(false);
    }
  }

  const quote = QUOTES[1];

  return (
    <main className="content goals-page">
      <div className="page-title">
        <div>
          <h1>Goals</h1>
          <p>Turn your ambition into daily progress.</p>
        </div>
        <button type="button" className="primary-btn" onClick={openCreate}>
          <Plus size={19} /> Add Goal
        </button>
      </div>

      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      <SuccessMessage>{notice}</SuccessMessage>
      <SearchNotice term={searchTerm} onClear={onClearSearch} />

      <div className="goal-toolbar">
        <div className="goal-filters" role="tablist" aria-label="Goal status">
          {TABS.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={tab === item}
              key={item}
              className={tab === item ? "selected" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="goals-layout">
        <div className="goals-main">
          <div className="metrics goal-metrics">
            <section className="metric">
              <span className="icon-box green">
                <Target size={23} />
              </span>
              <div>
                <strong>{stats.active}</strong>
                <label>Active Goals</label>
                <p>Keep going! 💪</p>
              </div>
            </section>
            <section className="metric">
              <span className="icon-box purple">
                <ChartNoAxesColumn size={23} />
              </span>
              <div>
                <strong>{stats.overall}%</strong>
                <label>Overall Progress</label>
                <p>Great consistency!</p>
              </div>
            </section>
            <section className="metric">
              <span className="icon-box blue">
                <CalendarDays size={23} />
              </span>
              <div>
                <strong>{stats.dueThisMonth}</strong>
                <label>Goals due this month</label>
                <p>Stay on track!</p>
              </div>
            </section>
            <section className="metric">
              <span className="icon-box orange">
                <Trophy size={23} />
              </span>
              <div>
                <strong>{stats.completed}</strong>
                <label>Completed Goals</label>
                <p>Well done! 🎉</p>
              </div>
            </section>
          </div>

          <h2 className="section-title">Your Goals</h2>

          {loading && !goals.length ? (
            <Skeleton height={120} count={3} />
          ) : visible.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={Target}
                title={goals.length ? "No goals match" : "No goals yet"}
                text={
                  goals.length
                    ? "Try another tab, category or search."
                    : "Create your first goal to start tracking your progress."
                }
                action={
                  !goals.length && (
                    <button type="button" className="primary-btn" onClick={openCreate}>
                      <Plus size={18} /> Create your first goal
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="goal-list">
              {visible.map((goal) => {
                const [Icon, tone] = CATEGORY_ICON[goal.category] || CATEGORY_ICON.Other;
                const overdue =
                  goal.status !== "Completed" && apiDateToString(goal.targetDate) < toDateString();
                return (
                  <article className="goal-card" key={goal.id}>
                    <span className={`icon-box ${tone}`}>
                      <Icon size={26} aria-hidden="true" />
                    </span>
                    <div className="goal-card-content">
                      <div className="goal-card-head">
                        <div>
                          <h3>{goal.title}</h3>
                          <p>{goal.description || "No description"}</p>
                        </div>
                        <div className="goal-meta">
                          <span style={overdue ? { color: "#e1242c" } : undefined}>
                            <CalendarDays size={15} aria-hidden="true" />{" "}
                            {formatShort(goal.targetDate)}
                            {overdue && " (overdue)"}
                          </span>
                          <span className={`badge ${STATUS_BADGE[goal.status] || ""}`}>
                            {goal.status}
                          </span>
                          <GoalMenu
                            goal={goal}
                            onEdit={openEdit}
                            onStatus={changeStatus}
                            onDelete={setDeleting}
                          />
                        </div>
                      </div>
                      <div className="goal-progress-line">
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label={`${goal.title} progress`}
                          aria-valuenow={goal.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${goal.progress}%` }} />
                        </div>
                        <b>{goal.progress}%</b>
                        <span>{captionFor(goal)}</span>
                      </div>
                      <div className="tag-row">
                        <span
                          className={`goal-tag ${goal.category.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          {goal.category}
                        </span>
                        <span
                          className={`goal-tag ${String(goal.term || "Medium Term")
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {goal.term || "Medium Term"}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="goals-aside">
          <section className="panel side-chart">
            <h3>Goals Progress</h3>
            <div className="pie-wrap">
              <Donut
                label="Goals by status"
                center={{ value: `${stats.overall}%`, caption: "Overall" }}
                data={GOAL_STATUSES.map((name) => ({
                  name,
                  value: goals.filter((goal) => goal.status === name).length,
                  color: GOAL_STATUS_COLORS[name],
                }))}
              />
              <div className="distribution-legend">
                {GOAL_STATUSES.map((name) => (
                  <div key={name}>
                    <i style={{ background: GOAL_STATUS_COLORS[name] }} /> {name}
                    <b>{goals.filter((goal) => goal.status === name).length}</b>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel side-chart">
            <h3>Category Distribution</h3>
            <div className="pie-wrap">
              <Donut
                label="Goals by category"
                center={{ value: goals.length, caption: "Goals" }}
                data={categoryData}
              />
              <div className="distribution-legend">
                {categoryData
                  .filter(
                    (entry) =>
                      entry.value > 0 ||
                      ["Career", "Skill Development", "Health", "Learning"].includes(entry.name),
                  )
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.name}>
                      <i style={{ background: entry.color }} /> {entry.name}
                      <b>{entry.value}</b>
                    </div>
                  ))}
              </div>
            </div>
          </section>

          <section className="panel milestones">
            <div className="panel-heading">
              <h3>Upcoming Milestones</h3>
            </div>
            {milestones.length ? (
              milestones.map((goal) => {
                const [Icon, tone] = CATEGORY_ICON[goal.category] || CATEGORY_ICON.Other;
                return (
                  <div className="milestone" key={goal.id}>
                    <span className={`icon-box ${tone}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <b>{goal.title}</b>
                      <small>Target date</small>
                    </div>
                    <span>
                      {formatShort(goal.targetDate)}{" "}
                      <ChevronRight size={12} style={{ verticalAlign: "middle" }} />
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="pi-muted" style={{ margin: 0 }}>
                No upcoming milestones.
              </p>
            )}
          </section>

          <aside className="goal-quote" aria-label="Quote">
            <Leaf size={16} />
            <strong>“{quote}”</strong>
            <small>Stay consistent. Keep going.</small>
            <span className="mountains" aria-hidden="true">
              ▲▲
            </span>
          </aside>
        </aside>
      </div>

      {modal && (
        <Modal
          title={modal.goal ? "Edit goal" : "Add goal"}
          subtitle="Define the outcome and how progress is measured."
          onClose={saving ? undefined : () => setModal(null)}
          width={560}
        >
          <form className="pi-form" onSubmit={submit} noValidate>
            <ErrorMessage>{formError}</ErrorMessage>

            <label className="field">
              Title
              <input name="title" value={form.title} onChange={updateForm} maxLength={150} />
            </label>
            <label className="field">
              Description
              <textarea
                name="description"
                rows={2}
                value={form.description}
                onChange={updateForm}
                maxLength={1000}
              />
            </label>

            <div className="pi-grid-3">
              <label className="field">
                Category
                <Select name="category" value={form.category} onChange={updateForm}>
                  {GOAL_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </label>
              <label className="field">
                Term
                <Select name="term" value={form.term} onChange={updateForm}>
                  {GOAL_TERMS.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </label>
              <label className="field">
                Status
                <Select name="status" value={form.status} onChange={updateForm}>
                  {GOAL_STATUSES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="pi-grid-2">
              <label className="field">
                Target date
                <DatePicker name="targetDate" value={form.targetDate} onChange={updateForm} />
              </label>
              <label className="field">
                Progress is measured by
                <Select name="progressMode" value={form.progressMode} onChange={updateForm}>
                  <option value="tasks">Linked tasks</option>
                  <option value="measurable">A measurable number</option>
                  <option value="manual">Manual percentage</option>
                </Select>
              </label>
            </div>

            {form.progressMode === "tasks" && (
              <p className="pi-muted">
                Progress = completed tasks ÷ tasks linked to this goal. Link tasks from the task
                form.
              </p>
            )}
            {form.progressMode === "manual" && (
              <label className="field">
                Progress (%)
                <input
                  type="number"
                  name="manualProgress"
                  min={0}
                  max={100}
                  value={form.manualProgress}
                  onChange={updateForm}
                />
              </label>
            )}
            {form.progressMode === "measurable" && (
              <div className="pi-grid-3">
                <label className="field">
                  Current
                  <input
                    type="number"
                    name="currentValue"
                    min={0}
                    value={form.currentValue}
                    onChange={updateForm}
                  />
                </label>
                <label className="field">
                  Target
                  <input
                    type="number"
                    name="targetValue"
                    min={1}
                    value={form.targetValue}
                    onChange={updateForm}
                  />
                </label>
                <label className="field">
                  Unit
                  <input
                    name="unit"
                    value={form.unit}
                    onChange={updateForm}
                    maxLength={30}
                    placeholder="problems"
                  />
                </label>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setModal(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? "Saving..." : modal.goal ? "Save changes" : "Add goal"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete goal?"
          message={`"${deleting.title}" will be deleted. Tasks linked to it are kept but unlinked.`}
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </main>
  );
}
