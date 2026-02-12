import type { Request, Response, NextFunction } from 'express';
import logger from '../config/logger.js';
import winston from 'winston';

interface TypedRequest extends Request {
  log?: winston.Logger;
}

export const requestLogger = (
  req: TypedRequest,
  res: Response,
  next: NextFunction
) => {
  req.log = logger.child({
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  req.log!.info('HTTP request started', {
    userAgent: req.get('User-Agent'),
  });
  next();
};
