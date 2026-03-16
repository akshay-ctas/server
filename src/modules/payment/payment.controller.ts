import { Request, Response } from 'express';
import mongoose from 'mongoose';

import { razorpayInstance } from '../../config/razorpay.config.js';
import crypto from 'crypto';
import Payment from '../payment/payment.model.js';
import orderModel from '../order/order.model.js';

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
          paymentMethod: 'razorpay',
          status: 'confirmed',
        },
        { new: true, session }
      );

      if (!order) throw new Error('Order not found');

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
      const { paymentId } = req.params;

      if (!amount || typeof amount !== 'number') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Amount must be a number',
        });
      }

      if (!paymentId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'paymentId is required' });
      }

      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(404)
          .json({ success: false, message: 'Payment not found' });
      }

      if (payment.status !== 'success') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Only successful payments can be refunded',
        });
      }

      if (!payment.razorpayPaymentId) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json({ success: false, message: 'Razorpay payment ID missing' });
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

      await session.commitTransaction();
      session.endSession();

      return res.json({
        success: true,
        message: 'Payment refunded successfully',
        refund,
        paymentId: payment._id,
        orderId: order?._id,
      });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({
        success: false,
        message: 'Refund failed',
        error: error.message,
      });
    }
  }
}
