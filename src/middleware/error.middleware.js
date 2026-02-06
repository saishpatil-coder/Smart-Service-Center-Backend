import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  // 1. Log the detailed error
  logger.error({
    message: err.message,
    method: req.method, // Log which HTTP method failed (GET, POST)
    url: req.originalUrl, // Log which endpoint failed
    stack: err.stack, // Log the stack trace (where in code it happened)
    user: req.user ? req.user.id : "Guest", // Log who caused it
  });

  // 2. Determine Status Code
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // 3. Send safe response to user (hide stack trace in production)
  res.status(statusCode).json({
    message: message,
  });
};