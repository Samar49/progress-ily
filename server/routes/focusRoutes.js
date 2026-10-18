const express = require("express");

const protect = require("../middleware/authMiddleware");
const {
  logSession,
  listSessions,
  getSummary,
  deleteSession,
} = require("../controllers/focusController");

const router = express.Router();

router.use(protect);

router.get("/summary", getSummary);
router.route("/").get(listSessions).post(logSession);
router.delete("/:id", deleteSession);

module.exports = router;
