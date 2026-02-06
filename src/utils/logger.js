import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format to print Message + Stack Trace + Metadata
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // If there is a stack trace, prefer that over the message
  const stackTrace = stack ? `\nStack Trace:\n${stack}` : "";

  // If there is extra metadata (url, method, user), stringify it
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : "";

return `${timestamp} [${level}]: ${message} ${metaString}${stackTrace}`;});

const logger = winston.createLogger({
  level: "info",
  // 1. Use JSON format for files (Best for searching/parsing later)
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), json()),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),

    // 2. Use Custom Colorized format for Console
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
    }),
  ],
});

export default logger;
