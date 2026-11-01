import {createLogger, format, transports} from 'winston';

// Winston logger with timestamp + pretty print in dev
export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize({ all: true }),
    format.printf(
      ({ level, message, timestamp, stack }) =>
        `[${timestamp}] ${level}: ${stack || message}`
    )
  ),
  transports: [
    new transports.Console(),
    // Uncomment if you want file logs:
    new transports.File({ filename: 'logs/app.log' }),
  ],
});
