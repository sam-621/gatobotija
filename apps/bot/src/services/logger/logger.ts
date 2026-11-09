import winston from 'winston';

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export function createLogger(): Logger {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const extra = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        const trace = typeof stack === 'string' ? `\n${stack}` : '';

        return `${String(timestamp)} ${level}: ${String(message)}${extra}${trace}`;
      })
    ),
    transports: [new winston.transports.Console()]
  });

  return {
    info: (message, meta) => logger.info(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    error: (message, error, meta) =>
      logger.error(message, {
        ...meta,
        ...(error instanceof Error ? { stack: error.stack } : error ? { error } : {})
      })
  };
}
