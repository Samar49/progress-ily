const mongoose = require("mongoose");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const TASK_CATEGORIES = [
  "DSA",
  "Global",
  "Fitness",
  "Project",
  "Studies",
  "Work",
  "Personal",
  "Other",
];

// Older records used these names; they are mapped when saved/read.
const LEGACY_CATEGORY_MAP = { Study: "Studies", Health: "Fitness" };

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Task owner is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Task title cannot be empty"],
      maxlength: [150, "Task title cannot exceed 150 characters"],
    },
    date: {
      type: Date,
      required: [true, "Task date is required"],
    },
    startTime: {
      type: String,
      default: "",
      validate: {
        validator: (value) => value === "" || TIME_PATTERN.test(value),
        message: "Start time must use 24-hour HH:mm format",
      },
    },
    endTime: {
      type: String,
      default: "",
      validate: {
        validator: (value) => value === "" || TIME_PATTERN.test(value),
        message: "End time must use 24-hour HH:mm format",
      },
    },
    category: {
      type: String,
      enum: {
        values: TASK_CATEGORIES,
        message: "Task category is not supported",
      },
      default: "Personal",
      set: (value) => LEGACY_CATEGORY_MAP[value] || value,
    },
    priority: {
      type: String,
      enum: {
        values: ["Low", "Medium", "High"],
        message: "Priority must be Low, Medium, or High",
      },
      default: "Medium",
    },
    status: {
      type: String,
      enum: {
        values: ["Pending", "In Progress", "Completed"],
        message: "Task status is not supported",
      },
      default: "Pending",
    },
    completedAt: { type: Date, default: null },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Task notes cannot exceed 2000 characters"],
      default: "",
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
  },
  { timestamps: true },
);

taskSchema.pre("validate", function validateTask() {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "End time must be later than start time");
  }

  if (this.status === "Completed") {
    if (!this.completedAt) this.completedAt = new Date();
  } else {
    this.completedAt = null;
  }
});

taskSchema.index({ userId: 1, date: 1, startTime: 1 });
taskSchema.index({ userId: 1, goalId: 1 });
taskSchema.index({ userId: 1, completedAt: 1 });

const Task = mongoose.model("Task", taskSchema);
Task.CATEGORIES = TASK_CATEGORIES;
module.exports = Task;
