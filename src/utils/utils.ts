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

export function getOrderStatusMessage(status: string) {
  switch (status) {
    case 'confirmed':
      return {
        title: '✅ Order Confirmed',
        message: 'Your order has been confirmed.',
      };
    case 'processing':
      return {
        title: '🛠 Order Processing',
        message: 'Your order is now being processed.',
      };
    case 'shipped':
      return {
        title: '🚚 Order Shipped',
        message: 'Your order has been shipped.',
      };
    case 'delivered':
      return {
        title: '📦 Order Delivered',
        message: 'Your order has been delivered.',
      };
    case 'cancelled':
      return {
        title: '❌ Order Cancelled',
        message: 'Your order has been cancelled.',
      };
    default:
      return {
        title: '🔔 Order Status Updated',
        message: `Your order status has been updated to ${status}.`,
      };
  }
}
