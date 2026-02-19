import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/types.js';
import slugify from 'slugify';
const slugifyFnImpl =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  typeof slugify === 'function' ? slugify : (slugify as any).default;

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

export function slugifyFn(title: string) {
  return slugifyFnImpl(title, { lower: true, strict: true });
}
