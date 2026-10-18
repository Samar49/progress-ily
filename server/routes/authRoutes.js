const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  deleteAccount,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const rateLimit = require("../utils/rateLimit");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  message: "Too many attempts. Please try again in a few minutes.",
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);

router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, authLimiter, changePassword);
router.delete("/account", protect, authLimiter, deleteAccount);

module.exports = router;
