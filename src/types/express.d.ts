import 'express';
import winston from 'winston';

declare global {
  namespace Express {
    interface Request {
      log?: winston.Logger;
      user?: {
        sub: string;
      };
    }
  }
}

export {};
