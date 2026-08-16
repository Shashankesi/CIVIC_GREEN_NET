function errorHandler(err, req, res, next) {
  const status = err.status || (err.statusCode ? err.statusCode : 500);
  const isProd = process.env.NODE_ENV === 'production';
  const code = err.code || 'SERVER_ERROR';

  if (!isProd || status >= 500) {
    console.error(`[Error Handler] [${req.requestId || '-'}] ${req.method} ${req.originalUrl}:`, err.message || err);
  }

  let message = err.message || 'Internal server error';
  if (isProd && status === 500) {
    message = 'An unexpected server error occurred. Please try again later.';
  }

  // Prevent database connection string leaks
  if (typeof message === 'string' && (message.includes('postgresql://') || message.includes('password='))) {
    message = 'Database operation failed.';
  }

  res.status(status).json({
    success: false,
    message,
    code,
    requestId: req.requestId || null
  });
}

module.exports = errorHandler;
