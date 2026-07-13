import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = app.listen(env.port, () => {
  logger.info(`Server running at http://${env.host}:${env.port} [${env.nodeEnv}]`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});
