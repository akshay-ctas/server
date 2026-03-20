import express, { Router } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import http from 'http';

import userRoutes from './modules/users/user.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import catalogRoutes from './modules/catalog/catalog.route.js';
import productRoutes from './modules/product/product.route.js';
import orderRoutes from './modules/order/order.routes.js';
import paymentRoutes from './modules/payment/payment.routes.js';
import notificationRoutes from './modules/notification/notification.route.js';

import { requestLogger } from './middleware/logger.js';
import { handleRazorpayWebhook } from './modules/payment/webhook.controller.js';

const app = express();
const router = Router();

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(cookieParser());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', catalogRoutes);
app.use('/api/product', productRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
router.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
