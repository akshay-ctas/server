import { Request, Response } from 'express';
import { Notification, RecipientType } from './notification.model.js';
import mongoose from 'mongoose';
import { User } from '../users/user.model.js';

export class NotificationController {
  async getNotification(req: Request, res: Response) {
    try {
      const { entityType, isRead } = req.query as {
        entityType?: string;
        isRead?: string;
      };

      console.log(entityType, 'entityType');
      console.log(isRead, 'isRead');

      const authedUserId = (req.user as any)?.sub as string | undefined;
      if (!authedUserId) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      }
      console.log(authedUserId, 'authedUserId');

      const userDoc = await User.findById(authedUserId).select('role').lean();
      if (!userDoc) {
        return res
          .status(401)
          .json({ success: false, message: 'user not found' });
      }

      const isAdmin = userDoc.role === 'admin';

      const filter: any = isAdmin
        ? { recipientType: RecipientType.ADMIN }
        : { recipientType: RecipientType.USER, recipientId: authedUserId };

      console.log('filter', filter);

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

      const unreadCount = await Notification.countDocuments({
        ...filter,
        isRead: false,
      });

      return res.status(200).json({
        success: true,
        unreadCount,
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
      const authedUserId = (req.user as any)?.sub as string | undefined;
      if (!authedUserId) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      }

      const userDoc = await User.findById(authedUserId).select('role').lean();
      if (!userDoc) {
        return res
          .status(401)
          .json({ success: false, message: 'user not found' });
      }

      const isAdmin = userDoc.role === 'admin';

      const baseFilter: any = isAdmin
        ? { recipientType: RecipientType.ADMIN }
        : { recipientType: RecipientType.USER, recipientId: authedUserId };

      const result = await Notification.updateMany(
        { ...baseFilter, isRead: false },
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

      const authedUserId = (req.user as any)?.sub as string | undefined;
      if (!authedUserId) {
        return res
          .status(401)
          .json({ success: false, message: 'Unauthorized' });
      }

      const userDoc = await User.findById(authedUserId).select('role').lean();
      if (!userDoc) {
        return res
          .status(401)
          .json({ success: false, message: 'user not found' });
      }

      const isAdmin = userDoc.role === 'admin';
      const ownerFilter: any = isAdmin
        ? { recipientType: RecipientType.ADMIN }
        : { recipientType: RecipientType.USER, recipientId: authedUserId };

      const notification = await Notification.findOneAndUpdate(
        { _id: id, ...ownerFilter, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notification) {
        const exists = await Notification.exists({ _id: id, ...ownerFilter });
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
