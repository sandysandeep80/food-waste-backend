const stats = {
  startedAt: new Date(),
  totalRequests: 0,
  status2xx: 0,
  status4xx: 0,
  status5xx: 0
};

function requestMonitor(req, res, next) {
  const start = Date.now();
  stats.totalRequests += 1;

  res.on("finish", () => {
    if (res.statusCode >= 500) {
      stats.status5xx += 1;
    } else if (res.statusCode >= 400) {
      stats.status4xx += 1;
    } else {
      stats.status2xx += 1;
    }

    const ms = Date.now() - start;
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });

  next();
}

function getStats() {
  return {
    ...stats,
    uptimeSeconds: Math.floor((Date.now() - stats.startedAt.getTime()) / 1000),
    memory: process.memoryUsage()
  };
}

module.exports = {
  requestMonitor,
  getStats
};
