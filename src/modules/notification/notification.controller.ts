import { Request, Response } from 'express';
import { Notification } from './notification.model.js';

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
        count: notifications.length,
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

  async isReadNotification(req: Request, res: Response) {
    try {
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
      });
    }
  }
}
