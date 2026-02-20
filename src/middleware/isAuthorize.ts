import jwt from 'jsonwebtoken';
import { NextFunction, Response, Request } from 'express';
import createHttpError from 'http-errors';
import { JwtPayload } from '../types/types.js';

export function isAuthorize(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw createHttpError(401, 'authorization denied');
  }
  let token = authHeader.split(' ')[1];
  token = token.replace(/^"|"$/g, '');

  const decoded = jwt.verify(
    token as string,
    process.env.ACCESS_TOKEN_SECRET!
  ) as JwtPayload;
  if (decoded.role !== 'admin') {
    throw createHttpError(403, 'Forbidden: Admins only');
  }
  req.user = decoded;

  next();
}
