import {
  Notification,
  INotification,
  NotificationType,
  RecipientType,
} from './notification.model.js';
import { Types } from 'mongoose';

type CreateNotificationInput = {
  type: NotificationType;
  recipientType: RecipientType;
  recipientId?: Types.ObjectId | null;
  title: string;
  message: string;
  entityId?: Types.ObjectId | null;
  entityType?: 'Order' | 'Payment' | null;
  actionUrl?: string | null;
};

export async function createNotification(
  data: CreateNotificationInput
): Promise<INotification> {
  return Notification.create({
    type: data.type,
    recipientType: data.recipientType,
    recipientId: data.recipientId ?? null,
    title: data.title,
    message: data.message,
    entityId: data.entityId ?? null,
    entityType: data.entityType ?? null,
    actionUrl: data.actionUrl ?? null,
  });
}
