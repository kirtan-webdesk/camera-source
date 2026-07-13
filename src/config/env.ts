import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  host: process.env['HOST'] ?? 'localhost',

  db: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    name: process.env['DB_NAME'] ?? 'camera_source',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? '',
  },

  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'fallback_secret',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  },

  cors: {
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
  },

  isDev: (process.env['NODE_ENV'] ?? 'development') === 'development',
  isProd: process.env['NODE_ENV'] === 'production',
} as const;
