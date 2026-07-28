import pinoHttp from 'pino-http';
import config from '../config/index.js';

export const requestLogger = pinoHttp({
  level: config.log.level,
  genReqId: (req) => req.requestId,
  customProps: (req) => ({
    requestId: req.requestId,
  }),
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
