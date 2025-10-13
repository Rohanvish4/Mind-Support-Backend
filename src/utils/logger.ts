import winston from 'winston';
import { config } from '../config/env';

/**
 * Configure Winston logger
 */
const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mindsupport-api',
    environment: config.env,
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service) {
            delete meta.service;
            delete meta.environment;
            if (Object.keys(meta).length > 0) {
              try {
                msg += ` ${JSON.stringify(meta, null, 2)}`;
              } catch (error) {
                // Handle circular references
                msg += ` [Complex Object - ${Object.keys(meta).join(', ')}]`;
              }
            }
          }
          return msg;
        })
      ),
    }),
  ],
});

// Add file transports in production
if (config.env === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

export { logger };