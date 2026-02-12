import 'express';
import winston from 'winston';

declare global {
  namespace Express {
    interface Request {
      log?: winston.Logger;
      files?: any;
    }
  }
}

export {};
