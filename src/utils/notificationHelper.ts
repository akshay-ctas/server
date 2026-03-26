import { Server } from 'socket.io';
import { CreateNotificationInput } from '../types/types.js';
import { Notification } from '../modules/notification/notification.model.js';

export const createAndEmitNotification = async (
  io: Server,
  data: CreateNotificationInput
) => {
  const {
    type,
    recipientType,
    recipientId = null,
    title,
    message,
    entityId = null,
    entityType = null,
    actionUrl = null,
  } = data;

  const notification = await Notification.create({
    type,
    recipientType,
    recipientId,
    title,
    message,
    entityId,
    entityType,
    actionUrl,
    isRead: false,
    readAt: null,
  });

  const unreadCount = await Notification.countDocuments(
    recipientType === 'ADMIN'
      ? { recipientType: 'ADMIN', isRead: false }
      : { recipientType: 'USER', recipientId, isRead: false }
  );

  const room =
    recipientType === 'ADMIN' ? 'room_admin' : `room_user_${recipientId}`;

  io.to(room).emit('notification:new', {
    type,
    unreadCount,
    notification,
  });
};
