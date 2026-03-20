import { Router } from 'express';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';
import { NotificationController } from './notification.controller.js';

const router = Router();

const notificationController = new NotificationController();

router.get(
  '/',
  isAuthenticate,
  isVerified,
  isAuthenticate,
  notificationController.getNotification
);

router.patch(
  '/',
  isAuthenticate,
  isVerified,
  isAuthenticate,
  notificationController.isReadNotification
);

export default router;
