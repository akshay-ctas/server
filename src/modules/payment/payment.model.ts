import mongoose, { Document, Types } from 'mongoose';

export interface PaymentDocument extends Document {
  orderId?: Types.ObjectId;
  userId?: Types.ObjectId;

  method: 'COD' | 'ONLINE';
  provider?: 'razorpay';

  amount: number;
  currency?: string;

  status: 'created' | 'success' | 'failed' | 'refunded';
  paymentFailureReason?: string;

  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  refundId?: string;
  refundedAmount?: number;

  metadata?: {
    cartItems?: any[];
    addressId?: string;
    pricing?: any;
    couponCode?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<PaymentDocument>(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    method: {
      type: String,
      enum: ['COD', 'ONLINE'],
      required: true,
    },

    provider: {
      type: String,
      enum: ['razorpay'],
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: 'INR',
    },

    status: {
      type: String,
      enum: ['created', 'success', 'failed', 'refund_processig', 'refunded'],
      default: 'created',
    },

    paymentFailureReason: {
      type: String,
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,

    refundId: String,
    refundedAmount: Number,

    metadata: {
      type: Object,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model<PaymentDocument>('Payment', paymentSchema);

export default Payment;
