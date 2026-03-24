import { Request, Response } from 'express';
import mongoose from 'mongoose';

import crypto from 'crypto';
import Payment from '../payment/payment.model.js';
import orderModel from '../order/order.model.js';
import { processRefund } from '../../utils/refend.js';
import {
  NotificationType,
  RecipientType,
} from '../notification/notification.model.js';
import { User } from '../users/user.model.js';
import { createAndEmitNotification } from '../../utils/notificationHelper.js';
import axios from 'axios';

export class PaymentController {
  constructor() {
    this.verifyPayment = this.verifyPayment.bind(this);
  }

  async verifyPayment(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
        req.body;
      const orderId = req.params.orderId;
      const paymentId = req.params.paymentId;
      const userId = req.user?.sub as string;
      if (!userId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'orderId is missing' });
      }

      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: 'User not found' });
      }

      const fullName = `${user.firstName} ${user.lastName}`;
      if (!orderId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'orderId is missing' });
      }

      if (!paymentId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'paymentId is missing' });
      }

      // Verify Razorpay signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'Invalid payment signature' });
      }

      // Update Payment document
      const payment = await Payment.findOneAndUpdate(
        { _id: paymentId },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          orderId,
          status: 'success',
        },
        { new: true, session }
      );

      if (!payment) throw new Error('Payment not found');

      // Update Order document
      const order = await orderModel.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'paid',
          paymentMethod: 'ONLINE',
          status: 'confirmed',
          $push: {
            statusHistory: {
              status: 'confirmed',
              changedAt: new Date(),
            },
          },
        },
        { new: true, session }
      );

      if (!order) throw new Error('Order not found');

      await createAndEmitNotification(req.app.get('io'), {
        type: NotificationType.PAYMENT_SUCCESS,
        recipientType: RecipientType.ADMIN,
        title: '💰 Payment Received – Order Confirmed',
        message: `Payment of ₹${payment.amount} for Order #${order._id} has been successfully received from ${fullName} via ${payment.provider}. Transaction ID: ${payment.razorpayPaymentId}.`,
        entityId: payment._id,
        entityType: 'Payment',
        actionUrl: `/admin/payments/${payment._id}`,
      });

      await createAndEmitNotification(req.app.get('io'), {
        type: NotificationType.PAYMENT_SUCCESS,
        recipientType: RecipientType.USER,
        recipientId: user._id,
        title: '✅ Payment Successful!',
        message: `Hi ${fullName}, we've received your payment of ₹${payment.amount} for Order #${order._id} via ${payment.provider}. Your order is now confirmed. Transaction ID: ${payment.razorpayPaymentId}.`,
        entityId: payment._id,
        entityType: 'Payment',
        actionUrl: `/orders/${order._id}`,
      });

      const itemCount = order.items.reduce(
        (acc, item) => acc + item.quantity,
        0
      );
      const io = req.app.get('io');
      await createAndEmitNotification(io, {
        type: NotificationType.NEW_ORDER,
        recipientType: RecipientType.USER,
        recipientId: user._id,
        title: '🎉 Order Placed Successfully!',
        message: `Hi ${user.firstName}, your order #${order._id} with ${itemCount} item(s) has been placed successfully. We'll notify you once it's confirmed and dispatched.`,
        entityId: order._id,
        entityType: 'Order',
        actionUrl: `/orders/${order._id}`,
      });

      await createAndEmitNotification(io, {
        type: NotificationType.NEW_ORDER,
        recipientType: RecipientType.ADMIN,
        title: '📥 New Order Placed – Action Required',
        message: `A new order #${order._id} worth ₹${payment.amount} has been placed by ${user.firstName} ${user.lastName}. It contains ${itemCount} item(s). Please review and confirm the fulfillment status.`,
        entityId: order._id,
        entityType: 'Order',
        actionUrl: `/orders/${order._id}`,
      });
      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message: 'Payment verified & order updated successfully',
        paymentId: payment._id,
        orderId: order._id,
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message,
      });
    }
  }

  async refundPayment(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { amount } = req.body;
      const paymentId = req.params.paymentId as string;
      const userId = req.user?.sub;
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: 'user id not found' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: 'user  not found' });
      }

      const fullName = `${user.firstName} ${user.lastName}`;

      const result = await processRefund({
        paymentId,
        amount,
        session,
        fullName,
        userId,
        req,
      });

      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message: 'Payment refunded successfully',
        ...result,
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
