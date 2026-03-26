import express, { Router } from 'express';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';
import { PaymentController } from './payment.controller.js';

const router = Router();

const paymentController = new PaymentController();

router.post(
  '/verify-payment/:orderId/:paymentId',
  isAuthenticate,
  isVerified,
  paymentController.verifyPayment
);

router.post(
  '/refund/:paymentId',
  isAuthenticate,
  isVerified,
  paymentController.refundPayment
);

export default router;
