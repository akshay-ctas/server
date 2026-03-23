import { Types } from 'mongoose';
import {
  NotificationType,
  RecipientType,
} from '../modules/notification/notification.model.js';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'customer' | 'manager';
}

declare global {
  namespace Express {
    interface Application {
      get(name: 'io'): import('socket.io').Server;
    }
  }
}
export interface CreateNotificationInput {
  type: NotificationType;
  recipientType: RecipientType;
  recipientId?: Types.ObjectId | string | null;
  title: string;
  message: string;
  entityId?: Types.ObjectId | string | null;
  entityType?: 'Order' | 'Payment' | null;
  actionUrl?: string | null;
}
