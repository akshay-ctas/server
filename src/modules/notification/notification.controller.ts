import { Request, Response } from 'express';
import { Notification, RecipientType } from './notification.model.js';
import mongoose from 'mongoose';

export class NotificationController {
  async getNotification(req: Request, res: Response) {
    try {
      const { entityType, isRead } = req.query as {
        entityType?: string;
        isRead?: string;
      };

      const filter: any = {
        recipientType: 'ADMIN',
      };

      if (entityType) {
        filter.entityType = entityType;
      }

      if (isRead === 'true') {
        filter.isRead = true;
      }

      if (isRead === 'false') {
        filter.isRead = false;
      }
      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        unreadCount: notifications.length,
        notifications,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
      });
    }
  }

  async markAllRead(req: Request, res: Response) {
    try {
      const result = await Notification.updateMany(
        { recipientType: 'ADMIN', isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );

      return res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        updatedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error('markAllRead error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notifications as read',
      });
    }
  }

  async markSingleAsRead(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      console.log(id);

      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID',
        });
      }

      const notification = await Notification.findOneAndUpdate(
        { _id: id, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notification) {
        const exists = await Notification.exists({ _id: id });
        return res.status(exists ? 200 : 404).json({
          success: exists ? true : false,
          message: exists
            ? 'Notification already marked as read'
            : 'Notification not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        notification,
      });
    } catch (error) {
      console.error('markSingleAsRead error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update notification',
      });
    }
  }
}
