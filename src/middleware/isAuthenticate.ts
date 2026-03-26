import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { User } from '../modules/users/user.model.js';

export async function isAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createHttpError(401, 'authorization denied'));
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);

    req.user = {
      sub: (decoded as any).sub,
    };
    await User.findByIdAndUpdate(decoded.sub, {
      lastLogin: new Date(),
    });
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'jwt expired'));
    }

    return next(createHttpError(401, 'invalid token'));
  }
}
