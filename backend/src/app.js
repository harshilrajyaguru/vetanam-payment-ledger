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

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: config.cors.origin,
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
