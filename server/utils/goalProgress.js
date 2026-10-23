// One place that defines how goal progress is calculated.
//   tasks      -> completed linked tasks / linked tasks
//   measurable -> currentValue / targetValue
//   manual     -> manualProgress
//   (legacy goals without progressMode: linked tasks win when present)
function clamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function computeGoalProgress(goal, stats) {
  const total = stats?.total || 0;
  const completed = stats?.completed || 0;
  const mode = goal.progressMode;

  if (mode === "tasks") {
    return total > 0 ? clamp((completed / total) * 100) : 0;
  }

  if (mode === "measurable") {
    const target = Number(goal.targetValue) || 0;
    const current = Number(goal.currentValue) || 0;
    return target > 0 ? clamp((current / target) * 100) : 0;
  }

  if (mode === "manual") {
    return clamp(goal.manualProgress);
  }

  return total > 0 ? clamp((completed / total) * 100) : clamp(goal.manualProgress);
}

module.exports = { computeGoalProgress, clamp };
