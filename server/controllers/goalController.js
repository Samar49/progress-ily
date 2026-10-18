const mongoose = require("mongoose");

const Goal = require("../models/Goal");
const Task = require("../models/Task");
const ApiError = require("../utils/ApiError");
const { parseFlexibleDate } = require("../utils/dates");
const { computeGoalProgress } = require("../utils/goalProgress");

const WRITABLE_FIELDS = [
  "title",
  "description",
  "category",
  "term",
  "targetDate",
  "status",
  "progressMode",
  "manualProgress",
  "targetValue",
  "currentValue",
  "unit",
];

const SORTS = {
  targetDate: { targetDate: 1, createdAt: -1 },
  newest: { createdAt: -1 },
  title: { title: 1 },
};

function getUserId(req) {
  if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
    throw new ApiError(401, "Not authorized. Please log in again.");
  }
  return new mongoose.Types.ObjectId(req.userId);
}

function requireValidId(id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid goal ID.");
}

function buildGoalData(body, { partial }) {
  const data = {};
  for (const field of WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
      data[field] = body[field];
    }
  }

  if (!partial || "title" in data) {
    if (typeof data.title !== "string" || !data.title.trim()) {
      throw new ApiError(400, "Goal title is required.");
    }
    data.title = data.title.trim();
  }

  if (!partial || "targetDate" in data) {
    const date = parseFlexibleDate(data.targetDate);
    if (!date) throw new ApiError(400, "A valid target date is required.");
    data.targetDate = date;
  }

  if ("description" in data && data.description !== null && typeof data.description !== "string") {
    throw new ApiError(400, "Description must be text.");
  }
  if ("description" in data && data.description === null) data.description = "";

  for (const field of ["manualProgress", "targetValue", "currentValue"]) {
    if (field in data) {
      const number = Number(data[field]);
      if (!Number.isFinite(number) || number < 0) {
        throw new ApiError(400, `${field} must be a non-negative number.`);
      }
      data[field] = number;
    }
  }
  if ("manualProgress" in data && data.manualProgress > 100) {
    throw new ApiError(400, "manualProgress cannot exceed 100.");
  }

  if (data.progressMode === "measurable") {
    // For a new goal both values are required; for a partial update they
    // are checked against the stored goal by the caller.
    if (!partial && !(Number(data.targetValue) > 0)) {
      throw new ApiError(400, "A target value greater than 0 is required for measurable goals.");
    }
  }

  return data;
}

async function statsFor(userId, goalIds) {
  if (!goalIds.length) return new Map();
  const stats = await Task.aggregate([
    { $match: { userId, goalId: { $in: goalIds } } },
    {
      $group: {
        _id: "$goalId",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
      },
    },
  ]);
  return new Map(stats.map((item) => [String(item._id), item]));
}

function present(goal, stats) {
  const plain = goal.toObject ? goal.toObject() : goal;
  return {
    ...plain,
    id: String(plain._id),
    progress: computeGoalProgress(plain, stats),
    linkedTaskCount: stats?.total || 0,
    completedTaskCount: stats?.completed || 0,
  };
}

// GET /api/goals?status=&category=&sort=
const getGoals = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { status, category, sort = "targetDate" } = req.query;
    const filter = { userId };

    if (status !== undefined) {
      if (!Goal.STATUSES.includes(status)) throw new ApiError(400, "Unsupported status filter.");
      filter.status = status;
    }
    if (category !== undefined) {
      if (!Goal.CATEGORIES.includes(category)) throw new ApiError(400, "Unsupported category filter.");
      filter.category = category;
    }
    if (sort !== "progress" && !SORTS[sort]) {
      throw new ApiError(400, "Unsupported sort option.");
    }

    const goals = await Goal.find(filter).sort(SORTS[sort] || SORTS.targetDate);
    const stats = await statsFor(userId, goals.map((goal) => goal._id));

    let result = goals.map((goal) => present(goal, stats.get(String(goal._id))));
    if (sort === "progress") result = result.sort((a, b) => b.progress - a.progress);

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

// GET /api/goals/:id
const getGoal = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);
    const goal = await Goal.findOne({ _id: req.params.id, userId });
    if (!goal) throw new ApiError(404, "Goal not found.");
    const stats = await statsFor(userId, [goal._id]);
    return res.status(200).json(present(goal, stats.get(String(goal._id))));
  } catch (error) {
    return next(error);
  }
};

// POST /api/goals
const createGoal = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const data = buildGoalData(req.body, { partial: false });
    const goal = await Goal.create({ ...data, userId });
    return res.status(201).json(present(goal, null));
  } catch (error) {
    return next(error);
  }
};

// PUT/PATCH /api/goals/:id
const updateGoal = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);

    const data = buildGoalData(req.body, { partial: true });
    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "No valid goal fields were provided.");
    }

    const goal = await Goal.findOne({ _id: req.params.id, userId });
    if (!goal) throw new ApiError(404, "Goal not found.");

    goal.set(data);
    if (goal.progressMode === "measurable" && !(goal.targetValue > 0)) {
      throw new ApiError(400, "A target value greater than 0 is required for measurable goals.");
    }
    await goal.save();

    const stats = await statsFor(userId, [goal._id]);
    return res.status(200).json(present(goal, stats.get(String(goal._id))));
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/goals/:id  (linked tasks are kept and unlinked)
const deleteGoal = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    requireValidId(req.params.id);

    const goal = await Goal.findOne({ _id: req.params.id, userId });
    if (!goal) throw new ApiError(404, "Goal not found.");

    await Task.updateMany({ userId, goalId: goal._id }, { $set: { goalId: null } });
    await Goal.deleteOne({ _id: goal._id, userId });

    return res
      .status(200)
      .json({ message: "Goal deleted successfully.", id: String(goal._id) });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getGoals, getGoal, createGoal, updateGoal, deleteGoal };
