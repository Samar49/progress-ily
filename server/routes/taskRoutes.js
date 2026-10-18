const express = require("express");

const protect = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");

const router = express.Router();

router.use(protect);

router.route("/").get(getTasks).post(createTask);
router.route("/:id").get(getTask).put(updateTask).patch(updateTask).delete(deleteTask);

module.exports = router;
