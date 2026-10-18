const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Stores the bcrypt hash (never the plain-text password).
    password: { type: String, required: true, select: false },
    preferences: {
      defaultCategory: { type: String, default: "Personal" },
      defaultView: { type: String, enum: ["Day", "Week", "Month"], default: "Day" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
