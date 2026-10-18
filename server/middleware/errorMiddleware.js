const ApiError = require("../utils/ApiError");

function notFound(req, res) {
  res.status(404).json({ message: "API endpoint not found.", code: "NOT_FOUND" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof ApiError) {
    return res.status(error.status).json({ message: error.message, code: error.code });
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body contains invalid JSON.", code: "INVALID_JSON" });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large.", code: "PAYLOAD_TOO_LARGE" });
  }

  if (error.name === "ValidationError") {
    const first = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: first?.message || "Validation failed.", code: "VALIDATION_ERROR" });
  }

  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid identifier or value.", code: "CAST_ERROR" });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: "A record with these details already exists.", code: "DUPLICATE" });
  }

  console.error("Unhandled API error:", error);
  return res.status(500).json({ message: "An unexpected server error occurred.", code: "SERVER_ERROR" });
}

module.exports = { notFound, errorHandler };
