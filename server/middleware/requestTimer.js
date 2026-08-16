const { performance } = require('perf_hooks');

/**
 * Enterprise Server Performance Timing Middleware (W3C Server-Timing compliant)
 * Accurately tracks total latency, service duration, and attaches Server-Timing headers.
 */
function requestTimer(req, res, next) {
  const startTime = performance.now();
  const originalEnd = res.end;
  req._timings = { start: startTime, dbDuration: 0 };

  res.end = function (...args) {
    const totalDuration = performance.now() - startTime;
    const dbDuration = req._timings.dbDuration || 0;
    const srvDuration = Math.max(0, totalDuration - dbDuration);

    const timingHeader = `total;dur=${totalDuration.toFixed(2)}, srv;dur=${srvDuration.toFixed(2)}${dbDuration > 0 ? `, db;dur=${dbDuration.toFixed(2)}` : ''}`;
    
    try {
      if (!res.headersSent) {
        res.setHeader('Server-Timing', timingHeader);
        res.setHeader('X-Response-Time', `${totalDuration.toFixed(2)}ms`);
      }
    } catch (e) {}

    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;

    // Redact query parameter secrets if any
    const cleanUrl = url.replace(/([?&](token|secret|password|key|otp|pass)=)[^&]*/gi, '$1[REDACTED]');

    if (totalDuration >= 2000) {
      console.warn(`[API SLOW] ${method} ${cleanUrl} ${status} ${totalDuration.toFixed(1)}ms (DB: ${dbDuration.toFixed(1)}ms)`);
    }

    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = requestTimer;

