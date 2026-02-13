import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/types.js';

export const generateAccessTokens = (payload: JwtPayload): string => {
  const secret = process.env.ACCESS_TOKEN_SECRET as string;
  if (!secret) throw new Error('ACCESS_TOKEN_SECRET is not defined');

  return jwt.sign(payload, secret, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
};

export const generateRefreshTokens = (payload: JwtPayload): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET as string;
  if (!secret) throw new Error('REFRESH_TOKEN_SECRET is not defined');

  return jwt.sign(payload, secret, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
};
