const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const Task = require("../models/Task");
const Goal = require("../models/Goal");
const FocusSession = require("../models/FocusSession");
const ApiError = require("../utils/ApiError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when the email is unknown, so a login attempt takes about
// as long either way and does not reveal which emails are registered.
const UNKNOWN_USER_HASH = "$2b$12$0uHoe/gZNQeVDpBt/psOb.WU83R6GByGX1GelqgivOQI3A1Hduiq6";

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  preferences: user.preferences || {},
});

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, "Server configuration error", "CONFIG");
  }
  return jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      throw new ApiError(400, "Name, email and password are required");
    }
    if (name.trim().length > 80) {
      throw new ApiError(400, "Name cannot exceed 80 characters");
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new ApiError(400, "Please enter a valid email address");
    }
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    if (password.length > 128) {
      throw new ApiError(400, "Password cannot exceed 128 characters");
    }

    if (await User.exists({ email: normalizedEmail })) {
      throw new ApiError(409, "An account with this email already exists");
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
    });

    return res.status(201).json({
      message: "Registration successful",
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    const passwordMatches = await bcrypt.compare(
      password,
      user ? user.password : UNKNOWN_USER_HASH,
    );
    if (!user || !passwordMatches) {
      throw new ApiError(401, "Invalid email or password");
    }

    return res.status(200).json({
      message: "Login successful",
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(401, "Account no longer exists.");
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(401, "Account no longer exists.");

    const { name, preferences } = req.body || {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
        throw new ApiError(400, "Name must be 1-80 characters");
      }
      user.name = name.trim();
    }

    if (preferences !== undefined) {
      if (typeof preferences !== "object" || preferences === null) {
        throw new ApiError(400, "Preferences must be an object");
      }
      const { defaultCategory, defaultView } = preferences;
      if (defaultCategory !== undefined) {
        if (!Task.CATEGORIES.includes(defaultCategory)) {
          throw new ApiError(400, "Unsupported default category");
        }
        user.preferences.defaultCategory = defaultCategory;
      }
      if (defaultView !== undefined) {
        if (!["Day", "Week", "Month"].includes(defaultView)) {
          throw new ApiError(400, "Unsupported default view");
        }
        user.preferences.defaultView = defaultView;
      }
    }

    await user.save();
    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      throw new ApiError(400, "Current and new password are required");
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      throw new ApiError(400, "New password must be 8-128 characters");
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) throw new ApiError(401, "Account no longer exists.");

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw new ApiError(400, "Current password is incorrect");
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return next(error);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== "string" || !password) {
      throw new ApiError(400, "Password is required to delete your account");
    }

    const user = await User.findById(req.userId).select("+password");
    if (!user) throw new ApiError(401, "Account no longer exists.");

    if (!(await bcrypt.compare(password, user.password))) {
      throw new ApiError(400, "Password is incorrect");
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    await Promise.all([
      Task.deleteMany({ userId }),
      Goal.deleteMany({ userId }),
      FocusSession.deleteMany({ userId }),
    ]);
    await User.deleteOne({ _id: userId });

    return res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
};
