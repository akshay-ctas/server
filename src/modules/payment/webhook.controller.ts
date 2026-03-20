import crypto from 'crypto';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import Payment from './payment.model.js';
import orderModel from '../order/order.model.js';
import { User } from '../users/user.model.js';
import { createNotification } from '../notification/notification.service.js';
import {
  NotificationType,
  RecipientType,
} from '../notification/notification.model.js';

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  const signature = req.headers['x-razorpay-signature'] as string | undefined;

  //   if (!signature) {
  //     return res
  //       .status(400)
  //       .json({ success: false, message: 'Missing webhook signature' });
  //   }

  const rawBody = req.body as Buffer;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid webhook signature' });
  }

  const parsedBody = JSON.parse(rawBody.toString());
  const event = parsedBody.event;
  const payload = parsedBody.payload;

  if (event === 'refund.processed') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const razorpayRefundId = payload.refund.entity.id;
      const refundAmount = (payload.refund.entity.amount ?? 0) / 100;

      const payment = await Payment.findOne({
        refundId: razorpayRefundId,
      }).session(session);

      if (!payment) throw new Error('Payment not found for this refund');

      if (payment.status === 'refunded') {
        await session.commitTransaction();
        session.endSession();

        return res.json({
          success: true,
          message: 'Refund already processed',
        });
      }

      const user = await User.findById(payment.userId).session(session);
      if (!user) throw new Error('User not found');

      const order = await orderModel.findByIdAndUpdate(
        payment.orderId,
        { paymentStatus: 'refunded' },
        { new: true, session }
      );

      if (!order) throw new Error('Order not found');

      payment.status = 'refunded';
      await payment.save({ session });

      const fullName = `${user.firstName} ${user.lastName}`;

      await createNotification({
        type: NotificationType.REFEND_SUCCESS,
        recipientType: RecipientType.ADMIN,
        title: '✅ Refund Successfully Processed',
        message: `Refund of ₹${refundAmount} for Order #${order._id} by ${fullName} has been successfully credited. Refund ID: ${razorpayRefundId}.`,
        entityId: payment._id,
        entityType: 'Payment',
        actionUrl: `/admin/payments/${payment._id}`,
      });

      await createNotification({
        type: NotificationType.REFEND_SUCCESS,
        recipientType: RecipientType.USER,
        recipientId: user._id,
        title: '💸 Refund Credited to Your Account!',
        message: `Hi ${user.firstName}, your refund of ₹${refundAmount} for Order #${order._id} has been successfully credited to your original payment method. Refund ID: ${razorpayRefundId}. If you do not see the amount yet, please contact your bank.`,
        entityId: payment._id,
        entityType: 'Payment',
        actionUrl: `/orders/${order._id}`,
      });

      await session.commitTransaction();
      session.endSession();

      return res.json({ success: true });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  return res.json({ success: true });
}
