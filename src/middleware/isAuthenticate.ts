import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/types.js';
import { NextFunction, Response, Request } from 'express';
import createHttpError from 'http-errors';

export function isAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createHttpError(401, 'authorization denied');
  }
  const token = authHeader.split(' ')[1];

  const decoded = jwt.verify(token as string, process.env.ACCESS_TOKEN_SECRET!);
  req.user = {
    sub: decoded.sub,
  } as JwtPayload;

  next();
}
