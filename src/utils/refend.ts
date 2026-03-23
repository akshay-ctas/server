import mongoose, { Types } from 'mongoose';
import { razorpayInstance } from '../config/razorpay.config.js';
import Payment from '../modules/payment/payment.model.js';
import orderModel from '../modules/order/order.model.js';
import {
  NotificationType,
  RecipientType,
} from '../modules/notification/notification.model.js';
import { createAndEmitNotification } from './notificationHelper.js';

export async function processRefund({
  paymentId,
  amount,
  session,
  fullName,
  orderId,
  userId,
  req,
}: {
  paymentId: string;
  amount: number;
  session: mongoose.ClientSession;
  fullName: string;
  orderId?: string;
  userId: string;
  req: any;
}) {
  if (!amount || typeof amount !== 'number') {
    throw new Error('Amount must be a number');
  }

  if (!paymentId) {
    throw new Error('paymentId is required');
  }

  const payment = await Payment.findById(paymentId).session(session);
  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'success') {
    throw new Error('Only successful payments can be refunded');
  }

  if (!payment.razorpayPaymentId) {
    throw new Error('Razorpay payment ID missing');
  }

  const refundOptions: { amount?: number } = {};
  if (amount) {
    refundOptions.amount = Math.floor(amount * 100);
  }

  const refund = await razorpayInstance.payments.refund(
    payment.razorpayPaymentId,
    refundOptions
  );
  const refundAmount = (refund.amount ?? 0) / 100;

  payment.status = 'refunded';
  payment.refundedAmount = (refund.amount ?? 0) / 100;
  payment.refundId = refund.id;
  await payment.save({ session });

  await createAndEmitNotification(req.app.get('io'), {
    type: NotificationType.REFEND_INITIATED,
    recipientType: RecipientType.ADMIN,
    title: '🔄 Refund Initiated – Review Required',
    message: `A refund of ₹${refundAmount} has been initiated for Order #${orderId} by ${fullName} via ${payment.provider}. Refund ID: ${refund.id}. Please review and ensure it is processed within 5–7 business days.`,
    entityId: payment._id,
    entityType: 'Payment',
    actionUrl: `/admin/refunds/${payment._id}`,
  });
  await createAndEmitNotification(req.app.get('io'), {
    type: NotificationType.REFEND_INITIATED,
    recipientType: RecipientType.USER,
    recipientId: new Types.ObjectId(userId),
    title: '🔄 Refund Initiated Successfully',
    message: `Hi ${fullName}, your refund of ₹${refundAmount} for Order #${orderId} has been initiated via ${payment.provider}. Refund ID: ${refund.id}. The amount will be credited within 5–7 business days.`,
    entityId: payment._id,
    entityType: 'Payment',
    actionUrl: `/orders/${orderId}`,
  });

  const order = await orderModel.findByIdAndUpdate(
    payment.orderId,
    { paymentStatus: 'refunded', status: 'cancelled' },
    { new: true, session }
  );

  if (order) {
    await createAndEmitNotification(req.app.get('io'), {
      type: NotificationType.ORDER_STATUS_UPDATED,
      recipientType: RecipientType.USER,
      recipientId: new Types.ObjectId(userId),
      title: '❌ Order Cancelled',
      message: `Your order #${order._id} has been cancelled.`,
      entityId: order._id,
      entityType: 'Order',
      actionUrl: `/orders/${order._id}`,
    });
  }

  return { refund, paymentId: payment._id, orderId: order?._id };
}
