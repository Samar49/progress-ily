const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/db");
const securityHeaders = require("./middleware/securityHeaders");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const goalRoutes = require("./routes/goalRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const focusRoutes = require("./routes/focusRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// CORS: comma-separated allow-list in CLIENT_ORIGIN. In development every
// origin is allowed when CLIENT_ORIGIN is not set.
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(securityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, health checks
      if (allowedOrigins.length === 0) return callback(null, !isProduction);
      return callback(null, allowedOrigins.includes(origin.replace(/\/$/, "")));
    },
  })
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.status(200).json({ message: "Progress.ily API is running" });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/focus", focusRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    console.error("Startup failed: set JWT_SECRET (at least 16 characters).");
    process.exit(1);
  }

  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
