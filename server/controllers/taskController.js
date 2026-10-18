const mongoose = require("mongoose");

const Task = require("../models/Task");
const Goal = require("../models/Goal");
const ApiError = require("../utils/ApiError");
const { parseDateOnly, parseFlexibleDate, addDaysUTC } = require("../utils/dates");

const WRITABLE_FIELDS = [
  "title",
  "date",
  "startTime",
  "endTime",
  "category",
  "priority",
  "status",
  "notes",
  "goalId",
];

const LEGACY_CATEGORY_MAP = { Study: "Studies", Health: "Fitness" };

function getUserId(req) {
  if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
    throw new ApiError(401, "Not authorized. Please log in again.");
  }
  return new mongoose.Types.ObjectId(req.userId);
}

function requireValidId(id, label = "task") {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label} ID.`);
  }
}

async function normalizeGoalId(goalId, userId) {
  if (goalId === null || goalId === "" || goalId === undefined) return null;
  if (!mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, "Invalid goal ID.");
  }
  const exists = await Goal.exists({ _id: goalId, userId });
  if (!exists) {
    throw new ApiError(400, "The selected goal does not exist or is not accessible.");
  }
  return new mongoose.Types.ObjectId(goalId);
}

// Whitelists fields and validates the ones that need more than the schema.
async function buildTaskData(body, userId, { partial }) {
  const data = {};
  for (const field of WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      data[field] = body[field];
    }
  }

  if (!partial || "title" in data) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new ApiError(400, "A task title is required.");
    }
    data.title = data.title.trim();
    if (data.title.length > 150) {
      throw new ApiError(400, "Task title cannot exceed 150 characters.");
    }
  }

  if (!partial || "date" in data) {
    const date = parseFlexibleDate(data.date);
    if (!date) throw new ApiError(400, "A valid task date is required.");
    data.date = date;
  }

  if ("category" in data && LEGACY_CATEGORY_MAP[data.category]) {
    data.category = LEGACY_CATEGORY_MAP[data.category];
  }

  for (const field of ["startTime", "endTime", "notes"]) {
    if (field in data && data[field] === null) data[field] = "";
    if (field in data && typeof data[field] !== "string") {
      throw new ApiError(400, `${field} must be text.`);
    }
  }

  if ("goalId" in data) {
    data.goalId = await normalizeGoalId(data.goalId, userId);
  }

  return data;
}

// GET /api/tasks
const getTasks = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { date, startDate, endDate, status, priority, category, search, goalId } = req.query;
    const filter = { userId };

    if (date !== undefined) {
      const day = parseDateOnly(date);
      if (!day) throw new ApiError(400, "date must use a valid YYYY-MM-DD format.");
      filter.date = { $gte: day, $lt: addDaysUTC(day, 1) };
    } else if (startDate !== undefined || endDate !== undefined) {
      const range = {};
      if (startDate !== undefined) {
        const start = parseDateOnly(startDate);
        if (!start) throw new ApiError(400, "startDate must use a valid YYYY-MM-DD format.");
        range.$gte = start;
      }
      if (endDate !== undefined) {
        const end = parseDateOnly(endDate);
        if (!end) throw new ApiError(400, "endDate must use a valid YYYY-MM-DD format.");
        range.$lt = addDaysUTC(end, 1);
      }
      if (range.$gte && range.$lt && range.$gte >= range.$lt) {
        throw new ApiError(400, "startDate cannot be later than endDate.");
      }
      filter.date = range;
    }

    if (status !== undefined) {
      if (!["Pending", "In Progress", "Completed"].includes(status)) {
        throw new ApiError(400, "Unsupported status filter.");
      }
      filter.status = status;
    }
    if (priority !== undefined) {
      if (!["Low", "Medium", "High"].includes(priority)) {
        throw new ApiError(400, "Unsupported priority filter.");
      }
      filter.priority = priority;
    }
    if (category !== undefined) {
      const normalized = LEGACY_CATEGORY_MAP[category] || category;
      if (!Task.CATEGORIES.includes(normalized)) {
        throw new ApiError(400, "Unsupported category filter.");
      }
      filter.category = normalized;
    }
    if (goalId !== undefined) {
      requireValidId(goalId, "goal");
      filter.goalId = new mongoose.Types.ObjectId(goalId);
    }
    if (search !== undefined) {
      if (typeof search !== "string" || search.length > 100) {
        throw new ApiError(400, "Invalid search value.");
      }
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (escaped) {
        filter.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { notes: { $regex: escaped, $options: "i" } },
        ];
      }
    }

    const tasks = await Task.find(filter)
      .sort({ date: 1, startTime: 1, createdAt: -1 })
      .limit(5000);

    return res.status(200).json({ count: tasks.length, tasks });
  } catch (error) {
    return next(error);
  }
};

// GET /api/tasks/:id
const getTask = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);
    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) throw new ApiError(404, "Task not found.");
    return res.status(200).json({ task });
  } catch (error) {
    return next(error);
  }
};

// POST /api/tasks
const createTask = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const data = await buildTaskData(req.body, userId, { partial: false });
    const task = await Task.create({ ...data, userId });
    return res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    return next(error);
  }
};

// PUT/PATCH /api/tasks/:id
const updateTask = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);

    const data = await buildTaskData(req.body, userId, { partial: true });
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "No valid fields were provided for update.");
    }

    // Load + save so schema hooks (time-range check, completedAt) always run.
    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) throw new ApiError(404, "Task not found.");

    task.set(data);
    await task.save();

    return res.status(200).json({ message: "Task updated successfully", task });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId });
    if (!task) throw new ApiError(404, "Task not found.");
    return res
      .status(200)
      .json({ message: "Task deleted successfully", id: String(task._id) });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask };
