const mongoose = require("mongoose");
const Task = require("../models/Task");
const Goal = require("../models/Goal");
const { computeGoalProgress } = require("../utils/goalProgress");

function getUserId(req) {
  if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(req.userId);
}

function parseDate(value, field) {
  if (value === undefined) {
    return { valid: true, date: null };
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return {
      valid: false,
      message: `${field} must use YYYY-MM-DD format.`,
    };
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return {
      valid: false,
      message: `${field} is not a valid date.`,
    };
  }

  return { valid: true, date };
}

function dateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function createBreakdown(tasks, field) {
  const counts = {};

  for (const task of tasks) {
    const name = task[field] || "Uncategorized";
    counts[name] = (counts[name] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// GET /api/analytics/summary
const getAnalyticsSummary = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Not authorized. Please log in again.",
      });
    }

    const start = parseDate(req.query.startDate, "startDate");
    const end = parseDate(req.query.endDate, "endDate");

    if (!start.valid) {
      return res.status(400).json({ message: start.message });
    }

    if (!end.valid) {
      return res.status(400).json({ message: end.message });
    }

    if (start.date && end.date && start.date > end.date) {
      return res.status(400).json({
        message: "startDate cannot be later than endDate.",
      });
    }

    // The browser sends its own calendar date so "today" matches the user's
    // timezone instead of the server's UTC day.
    const todayParam = parseDate(req.query.today, "today");

    if (!todayParam.valid) {
      return res.status(400).json({ message: todayParam.message });
    }

    const taskFilter = { userId };

    if (start.date || end.date) {
      taskFilter.date = {};

      if (start.date) {
        taskFilter.date.$gte = start.date;
      }

      if (end.date) {
        const exclusiveEnd = new Date(end.date);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        taskFilter.date.$lt = exclusiveEnd;
      }
    }

    const [tasks, goals] = await Promise.all([
      Task.find(taskFilter).select("date category priority status goalId").lean(),

      Goal.find({ userId })
        .select("title targetDate status manualProgress progressMode targetValue currentValue")
        .sort({ targetDate: 1 })
        .lean(),
    ]);

    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "Completed").length;
    const pending = tasks.filter((task) => task.status === "Pending").length;
    const inProgress = tasks.filter((task) => task.status === "In Progress").length;
    const highPriority = tasks.filter((task) => task.priority === "High").length;

    const today = todayParam.date ? new Date(todayParam.date) : new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayKey = dateKey(today);
    const trend = new Map();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today);
      day.setUTCDate(day.getUTCDate() - offset);

      const key = dateKey(day);

      trend.set(key, {
        date: key,
        label: day.toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        }),
        total: 0,
        completed: 0,
      });
    }

    for (const task of tasks) {
      const day = trend.get(dateKey(task.date));

      if (!day) continue;

      day.total += 1;

      if (task.status === "Completed") {
        day.completed += 1;
      }
    }

    // Calculate linked-task progress only from records owned by this user.
    const goalIds = goals.map((goal) => goal._id);

    const goalTaskStats = goalIds.length
      ? await Task.aggregate([
          {
            $match: {
              userId,
              goalId: { $in: goalIds },
            },
          },
          {
            $group: {
              _id: "$goalId",
              total: { $sum: 1 },
              completed: {
                $sum: {
                  $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
                },
              },
            },
          },
        ])
      : [];

    const statsByGoal = new Map(goalTaskStats.map((item) => [String(item._id), item]));

    const goalProgress = goals.map((goal) => ({
      id: String(goal._id),
      title: goal.title,
      status: goal.status,
      targetDate: goal.targetDate,
      progress: computeGoalProgress(goal, statsByGoal.get(String(goal._id))),
    }));

    const activeGoals = goalProgress.filter((goal) => goal.status === "Active");

    const completedGoals = goalProgress.filter((goal) => goal.status === "Completed");

    const onHoldGoals = goalProgress.filter((goal) => goal.status === "On Hold");

    const notStartedGoals = goalProgress.filter((goal) => goal.status === "Not Started");

    const overdueGoals = activeGoals.filter(
      (goal) => goal.targetDate && dateKey(goal.targetDate) < todayKey,
    );

    const dueSoonGoals = activeGoals.filter((goal) => {
      if (!goal.targetDate) return false;

      const target = new Date(goal.targetDate);
      target.setUTCHours(0, 0, 0, 0);

      const nextSevenDays = new Date(today);
      nextSevenDays.setUTCDate(nextSevenDays.getUTCDate() + 7);

      return target >= today && target <= nextSevenDays;
    });

    const averageActiveGoalProgress = activeGoals.length
      ? Math.round(activeGoals.reduce((sum, goal) => sum + goal.progress, 0) / activeGoals.length)
      : 0;

    return res.status(200).json({
      summary: {
        taskCounts: {
          total,
          completed,
          pending,
          inProgress,
          highPriority,
        },

        completionRate: total ? Math.round((completed / total) * 100) : 0,

        dailyTrend: [...trend.values()],

        categoryBreakdown: createBreakdown(tasks, "category"),

        priorityBreakdown: createBreakdown(tasks, "priority"),

        goalCounts: {
          total: goals.length,
          active: activeGoals.length,
          completed: completedGoals.length,
          onHold: onHoldGoals.length,
          notStarted: notStartedGoals.length,
          overdue: overdueGoals.length,
          dueSoon: dueSoonGoals.length,
        },

        averageActiveGoalProgress,
        goals: goalProgress,

        filters: {
          startDate: start.date ? dateKey(start.date) : null,
          endDate: end.date ? dateKey(end.date) : null,
          taskScope: start.date || end.date ? "selectedDateRange" : "allTasks",
        },
      },
    });
  } catch (error) {
    console.error("Get analytics summary error:", error);

    return res.status(500).json({
      message: "Failed to generate analytics summary.",
    });
  }
};

module.exports = { getAnalyticsSummary };
