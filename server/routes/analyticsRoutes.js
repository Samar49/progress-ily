
const express = require("express");

const protect = require("../middleware/authMiddleware");
const {
  getAnalyticsSummary,
} = require("../controllers/analyticsController");

const router = express.Router();

router.use(protect);

router.get("/summary", getAnalyticsSummary);

module.exports = router;
