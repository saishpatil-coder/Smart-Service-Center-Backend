import winston from "winston";

// Define log levels (severity)
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for the console
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston about our colors
winston.addColors(colors);

// Define the format of the logs
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }), // Colorize everything
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`,
  ),
);

// Create the logger instance
const logger = winston.createLogger({
  levels,
  format,
  transports: [
    // 1. Print to console (always)
    new winston.transports.Console(),

    // 2. Save errors to a file (optional, good for production)
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.uncolorize(), // Remove colors for file
    }),

    // 3. Save all logs to a combined file
    new winston.transports.File({
      filename: "logs/all.log",
      format: winston.format.uncolorize(),
    }),
  ],
});

export default logger;
