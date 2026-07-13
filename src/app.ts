import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// Security & parsing
app.use(helmet());
app.use(cors({ origin: env.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.nodeEnv, timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
