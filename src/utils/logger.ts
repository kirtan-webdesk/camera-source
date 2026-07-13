import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const timestamp = () => new Date().toISOString();

const log = (level: LogLevel, message: string, meta?: unknown) => {
  const entry = { timestamp: timestamp(), level, message, ...(meta ? { meta } : {}) };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else if (level === 'debug' && env.isDev) {
    console.debug(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};
