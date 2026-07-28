import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import config from './config/index.js';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import apiRouter, { healthRoutes } from './routes/index.js';
import { setupSwagger } from './config/swagger.js';

export function createApp() {
  const app = express();

  // Trust first proxy (Render / load balancers) to parse X-Forwarded-For for accurate req.ip
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'https://vetanam-payment-ledger.vercel.app',
    'https://vetanam-payment-ledger-2znoanpst-harshil15.vercel.app',
  ];

  if (process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL.split(',').forEach((url) => {
      const trimmed = url.trim();
      if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    });
  }

  if (config.cors.origin) {
    config.cors.origin.split(',').forEach((url) => {
      const trimmed = url.trim();
      if (trimmed && !allowedOrigins.includes(trimmed)) {
        allowedOrigins.push(trimmed);
      }
    });
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRoutes);
  app.use(`${config.apiBasePath}/health`, healthRoutes);
  app.use(config.apiBasePath, apiRouter);

  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
