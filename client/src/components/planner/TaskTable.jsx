import { Check, Pencil, Trash2 } from "lucide-react";

import Badge, { categoryTone } from "../common/Badge.jsx";
import { formatTime12 } from "../../utils/date.js";

// eslint-disable-next-line react-refresh/only-export-components
export function normalizeTask(task) {
  return {
    ...task,
    id: task._id || task.id,
    time: task.startTime
      ? task.endTime
        ? `${formatTime12(task.startTime)} – ${formatTime12(task.endTime)}`
        : formatTime12(task.startTime)
      : "Not scheduled",
    detail: task.notes || "",
  };
}

export default function TaskTable({
  tasks = [],
  compact = false,
  onToggle,
  onEdit,
  onDelete,
  busyId,
  emptyText = "No tasks found.",
}) {
  if (!tasks.length) {
    return (
      <div className="pi-empty pi-empty-inline">
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="task-table">
        <thead>
          <tr>
            <th className="check-col">
              <span className="pi-sr-only">Complete</span>
            </th>
            <th>Time</th>
            <th>Task</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            {!compact && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const done = task.status === "Completed";
            return (
              <tr key={task.id}>
                <td>
                  <button
                    type="button"
                    className={`check ${done ? "checked" : ""}`}
                    onClick={() => onToggle?.(task)}
                    disabled={busyId === task.id || !onToggle}
                    aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    aria-pressed={done}
                  >
                    {done && <Check size={13} />}
                  </button>
                </td>
                <td className="time-cell">{task.time}</td>
                <td>
                  <div className="task-name">{task.title}</div>
                  {!compact && task.detail && <div className="task-detail">{task.detail}</div>}
                </td>
                <td>
                  <Badge tone={categoryTone(task.category)}>{task.category || "Personal"}</Badge>
                </td>
                <td>
                  <Badge tone={(task.priority || "Medium").toLowerCase()}>
                    {task.priority || "Medium"}
                  </Badge>
                </td>
                <td>
                  <Badge>{task.status}</Badge>
                </td>
                {!compact && (
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => onEdit?.(task)}
                        disabled={busyId === task.id}
                        aria-label={`Edit ${task.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="delete"
                        onClick={() => onDelete?.(task)}
                        disabled={busyId === task.id}
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
