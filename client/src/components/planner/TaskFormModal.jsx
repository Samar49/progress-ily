import { useEffect, useState } from "react";

import Modal from "../common/Modal.jsx";
import { ErrorMessage } from "../common/Feedback.jsx";
import { addTask, editTask, getGoals, getErrorMessage } from "../../api.js";
import { CATEGORIES, PRIORITIES, STATUSES } from "../../constants.js";
import { apiDateToString, toDateString } from "../../utils/date.js";
import Select from "../common/Select.jsx";
import DatePicker from "../common/DatePicker.jsx";
import TimePicker from "../common/TimePicker.jsx";

function initialForm(task, defaults) {
  if (task) {
    return {
      title: task.title || "",
      date: apiDateToString(task.date) || toDateString(),
      startTime: task.startTime || "",
      endTime: task.endTime || "",
      category: task.category || "Personal",
      priority: PRIORITIES.includes(task.priority) ? task.priority : "Medium",
      status: STATUSES.includes(task.status) ? task.status : "Pending",
      notes: task.notes || "",
      goalId: task.goalId || "",
    };
  }
  return {
    title: "",
    date: defaults?.date || toDateString(),
    startTime: defaults?.startTime || "",
    endTime: defaults?.endTime || "",
    category: CATEGORIES.includes(defaults?.category) ? defaults.category : "Personal",
    priority: defaults?.priority || "Medium",
    status: "Pending",
    notes: "",
    goalId: "",
  };
}

export default function TaskFormModal({ task, defaults, onClose, onSaved }) {
  const [form, setForm] = useState(() => initialForm(task, defaults));
  const [goals, setGoals] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // An older task may carry a category that is no longer offered (e.g. DSA);
  // keep it selectable so editing never silently changes it.
  const categoryOptions = CATEGORIES.includes(form.category) ? CATEGORIES : [form.category, ...CATEGORIES];

  useEffect(() => {
    let active = true;
    getGoals()
      .then((records) => active && setGoals(records.filter((goal) => goal.status !== "Completed")))
      .catch(() => active && setGoals([]));
    return () => {
      active = false;
    };
  }, []);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");

    const title = form.title.trim();
    if (!title) return setError("Please enter a task title.");
    if (title.length > 150) return setError("Task title cannot exceed 150 characters.");
    if (!form.date) return setError("Please select a date.");
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      return setError("End time must be later than start time.");
    }

    const payload = {
      title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      category: form.category,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim(),
      goalId: form.goalId || null,
    };

    setSaving(true);
    try {
      const saved = task ? await editTask(task.id || task._id, payload) : await addTask(payload);
      onSaved?.(saved, payload);
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={task ? "Edit task" : "Add task"}
      subtitle={task ? "Update the details of this task." : "Plan something for your day."}
      onClose={saving ? undefined : onClose}
      width={540}
    >
      <form className="pi-form" onSubmit={submit} noValidate>
        <ErrorMessage>{error}</ErrorMessage>

        <label className="field">
          Title
          <input name="title" value={form.title} onChange={update} maxLength={150} required />
        </label>

        <div className="pi-grid-3">
          <label className="field">
            Date
            <DatePicker name="date" value={form.date} onChange={update} />
          </label>
          <label className="field">
            Start
            <TimePicker name="startTime" value={form.startTime} onChange={update} />
          </label>
          <label className="field">
            End
            <TimePicker name="endTime" value={form.endTime} onChange={update} />
          </label>
        </div>

        <div className="pi-grid-3">
          <label className="field">
            Category
            <Select name="category" value={form.category} onChange={update}>
              {categoryOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </label>
          <label className="field">
            Priority
            <Select name="priority" value={form.priority} onChange={update}>
              {PRIORITIES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </label>
          <label className="field">
            Status
            <Select name="status" value={form.status} onChange={update}>
              {STATUSES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </label>
        </div>

        <label className="field">
          Goal (optional)
          <Select name="goalId" value={form.goalId} onChange={update}>
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id || goal._id} value={goal.id || goal._id}>
                {goal.title}
              </option>
            ))}
          </Select>
        </label>

        <label className="field">
          Notes
          <textarea name="notes" rows={3} value={form.notes} onChange={update} maxLength={2000} placeholder="Add a short description" />
        </label>

        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? "Saving..." : task ? "Save changes" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}