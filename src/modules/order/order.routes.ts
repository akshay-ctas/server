import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';

const router = Router();

const orderController = new OrderController();

router.post(
  '/create-order',
  isAuthenticate,
  isVerified,
  orderController.createOrder
);

router.get('/:orderId', isAuthenticate, isVerified, orderController.getById);
router.get('/', isAuthenticate, isVerified, orderController.getOrders);

export default router;
