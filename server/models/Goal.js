const mongoose = require("mongoose");

const GOAL_STATUSES = ["Not Started", "Active", "Completed", "On Hold"];
const GOAL_CATEGORIES = [
  "Career",
  "Skill Development",
  "Health",
  "Learning",
  "Finance",
  "Personal",
  "Other",
];

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Goal title is required"],
      trim: true,
      maxlength: [150, "Goal title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    category: {
      type: String,
      trim: true,
      enum: GOAL_CATEGORIES,
      default: "Personal",
    },
    term: {
      type: String,
      enum: ["Short Term", "Medium Term", "Long Term"],
      default: "Medium Term",
    },
    targetDate: {
      type: Date,
      required: [true, "Target date is required"],
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: "Active",
    },
    // How progress is calculated: "tasks" (linked tasks), "measurable"
    // (currentValue / targetValue) or "manual" (manualProgress).
    progressMode: {
      type: String,
      enum: ["tasks", "measurable", "manual"],
      default: "tasks",
    },
    manualProgress: { type: Number, min: 0, max: 100, default: 0 },
    targetValue: { type: Number, min: 0, default: 0 },
    currentValue: { type: Number, min: 0, default: 0 },
    unit: {
      type: String,
      trim: true,
      maxlength: [30, "Unit cannot exceed 30 characters"],
      default: "",
    },
  },
  { timestamps: true },
);

goalSchema.index({ userId: 1, targetDate: 1 });

const Goal = mongoose.model("Goal", goalSchema);
Goal.STATUSES = GOAL_STATUSES;
Goal.CATEGORIES = GOAL_CATEGORIES;
module.exports = Goal;
