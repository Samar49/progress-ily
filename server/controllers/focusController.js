const mongoose = require("mongoose");

const FocusSession = require("../models/FocusSession");
const Task = require("../models/Task");
const ApiError = require("../utils/ApiError");
const { parseDateOnly, addDaysUTC, dateKey } = require("../utils/dates");

function getUserId(req) {
  if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
    throw new ApiError(401, "Not authorized. Please log in again.");
  }
  return new mongoose.Types.ObjectId(req.userId);
}

function rangeFilter(query) {
  const filter = {};
  if (query.startDate !== undefined) {
    const start = parseDateOnly(query.startDate);
    if (!start) throw new ApiError(400, "startDate must use a valid YYYY-MM-DD format.");
    filter.$gte = start;
  }
  if (query.endDate !== undefined) {
    const end = parseDateOnly(query.endDate);
    if (!end) throw new ApiError(400, "endDate must use a valid YYYY-MM-DD format.");
    filter.$lt = addDaysUTC(end, 1);
  }
  return Object.keys(filter).length ? { startedAt: filter } : {};
}

// POST /api/focus  - log a finished session
const logSession = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { taskId, type = "focus", startedAt, endedAt } = req.body || {};

    const started = new Date(startedAt);
    const ended = new Date(endedAt);
    if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) {
      throw new ApiError(400, "Valid startedAt and endedAt timestamps are required.");
    }
    if (ended <= started) {
      throw new ApiError(400, "endedAt must be later than startedAt.");
    }
    if (ended.getTime() - Date.now() > 60 * 1000) {
      throw new ApiError(400, "endedAt cannot be in the future.");
    }
    if (!["focus", "break"].includes(type)) {
      throw new ApiError(400, "type must be focus or break.");
    }

    let category = "Other";
    let normalizedTaskId = null;
    if (taskId) {
      if (!mongoose.isValidObjectId(taskId)) throw new ApiError(400, "Invalid task ID.");
      const task = await Task.findOne({ _id: taskId, userId }).select("category");
      if (!task) throw new ApiError(400, "The selected task does not exist or is not accessible.");
      normalizedTaskId = task._id;
      category = task.category;
    }

    const durationMinutes = Math.round(((ended - started) / 60000) * 100) / 100;

    const session = await FocusSession.create({
      userId,
      taskId: normalizedTaskId,
      category,
      type,
      startedAt: started,
      endedAt: ended,
      durationMinutes,
    });

    return res.status(201).json({ session });
  } catch (error) {
    return next(error);
  }
};

// GET /api/focus?startDate&endDate
const listSessions = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const sessions = await FocusSession.find({ userId, ...rangeFilter(req.query) })
      .sort({ startedAt: -1 })
      .limit(1000);
    return res.status(200).json({ count: sessions.length, sessions });
  } catch (error) {
    return next(error);
  }
};

// GET /api/focus/summary?startDate&endDate  (focus sessions only)
const getSummary = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const sessions = await FocusSession.find({
      userId,
      type: "focus",
      ...rangeFilter(req.query),
    })
      .select("startedAt category durationMinutes")
      .lean();

    const perDay = {};
    const perCategory = {};
    let totalMinutes = 0;

    for (const session of sessions) {
      const key = dateKey(session.startedAt);
      perDay[key] = (perDay[key] || 0) + session.durationMinutes;
      perCategory[session.category] =
        (perCategory[session.category] || 0) + session.durationMinutes;
      totalMinutes += session.durationMinutes;
    }

    return res.status(200).json({
      summary: {
        totalMinutes: Math.round(totalMinutes),
        sessionCount: sessions.length,
        perDay: Object.entries(perDay).map(([date, minutes]) => ({
          date,
          minutes: Math.round(minutes),
        })),
        perCategory: Object.entries(perCategory).map(([name, minutes]) => ({
          name,
          minutes: Math.round(minutes),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/focus/:id
const deleteSession = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new ApiError(400, "Invalid session ID.");
    }
    const session = await FocusSession.findOneAndDelete({ _id: req.params.id, userId });
    if (!session) throw new ApiError(404, "Session not found.");
    return res.status(200).json({ message: "Session deleted", id: String(session._id) });
  } catch (error) {
    return next(error);
  }
};

module.exports = { logSession, listSessions, getSummary, deleteSession };
