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

// router.post(
//   '/payment/verify-payment',
//   isAuthenticate,
//   isVerified,
//   orderController.verifyPayment
// );

export default router;
