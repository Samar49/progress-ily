// Small in-memory fixed-window rate limiter (no external dependency).
// Suitable for a single server instance. Use a shared store (e.g. Redis)
// if you scale horizontally.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message } = {}) {
  const hits = new Map();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  return function limiter(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        message: message || "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
      });
    }

    return next();
  };
}

module.exports = rateLimit;
