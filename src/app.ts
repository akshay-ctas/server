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
import dashboardRoutes from './modules/dashboard/dashboard.route.js';

import { requestLogger } from './middleware/logger.js';
import { handleRazorpayWebhook } from './modules/payment/webhook.controller.js';
import { Server, Socket } from 'socket.io';
import { RecipientType } from './modules/notification/notification.model.js';

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(requestLogger);

app.post(
  '/api/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('io', io);

interface JoinPayload {
  role: RecipientType;
  userId?: string;
}

io.on('connection', (socket: Socket) => {
  console.log('Socket connected on server:', socket.id);

  socket.on('join', ({ role, userId }: JoinPayload) => {
    console.log('join event received:', { role, userId });

    const room =
      role === RecipientType.ADMIN ? 'room_admin' : `room_user_${userId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected on server:', reason);
  });
});

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', catalogRoutes);
app.use('/api/product', productRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export { app, httpServer };
