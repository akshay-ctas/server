// services/payment.service.ts

import mongoose from 'mongoose';
import { razorpayInstance } from '../config/razorpay.config.js';
import Payment from '../modules/payment/payment.model.js';
import orderModel from '../modules/order/order.model.js';

export async function processRefund({
  paymentId,
  amount,
  session,
}: {
  paymentId: string;
  amount: number;
  session: mongoose.ClientSession;
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

  payment.status = 'refunded';
  payment.refundedAmount = (refund.amount ?? 0) / 100;
  payment.refundId = refund.id;
  await payment.save({ session });

  const order = await orderModel.findByIdAndUpdate(
    payment.orderId,
    { paymentStatus: 'refunded', status: 'cancelled' },
    { new: true, session }
  );

  return { refund, paymentId: payment._id, orderId: order?._id };
}
