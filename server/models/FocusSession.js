const mongoose = require("mongoose");

const focusSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },
    category: { type: String, trim: true, maxlength: 40, default: "Other" },
    type: { type: String, enum: ["focus", "break"], default: "focus" },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 0.1, max: 600 },
  },
  { timestamps: true }
);

focusSessionSchema.index({ userId: 1, startedAt: 1 });

module.exports = mongoose.model("FocusSession", focusSessionSchema);
