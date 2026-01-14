/**
 * Global error handler middleware for ShadowLink
 * Catches and handles all errors in a consistent way
 */
function errorHandler(err, req, res, next) {
  // Log the error
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Default error response
  let statusCode = err.status || err.statusCode || 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Not found';
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = 'CORS policy violation';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: isDevelopment ? err.message : message,
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route ${req.method} ${req.path} not found`);
  error.status = 404;
  next(error);
}

module.exports = { errorHandler, notFoundHandler };