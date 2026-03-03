const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 200;
const buckets = new Map();

function cleanup(now) {
  for (const [ip, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(ip);
    }
  }
}

function rateLimit(req, res, next) {
  const now = Date.now();
  if (Math.random() < 0.02) {
    cleanup(now);
  }

  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const current = buckets.get(ip);

  if (!current || current.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds);
    return res.status(429).json({ message: "Too many requests. Please try again later." });
  }

  return next();
}

module.exports = rateLimit;
