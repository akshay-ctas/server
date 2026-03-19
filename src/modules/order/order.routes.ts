import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';
import { OrderService } from './order.service.js';

const router = Router();

const orderService = new OrderService();

const orderController = new OrderController(orderService);

router.post(
  '/create-order',
  isAuthenticate,
  isVerified,
  orderController.createOrder
);

router.get('/admin', orderController.getAllOrders);
router.get('/admin/:orderId', orderController.getOrderDetail);
router.patch('/admin/:orderId/:status', orderController.orderStatusUpdate);

router.get('/:orderId', isAuthenticate, isVerified, orderController.getById);

router.get('/', isAuthenticate, isVerified, orderController.getMyOrders);

export default router;
