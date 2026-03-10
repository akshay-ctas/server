import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  total: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    items: [orderItemSchema],

    pricing: {
      subtotal: Number,
      discount: Number,
      tax: Number,
      shipping: Number,
      total: Number,
    },

    paymentMethod: {
      type: String,
      enum: ['ONLINE', 'COD'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },

    shippingAddress: {
      fullName: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      phone: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
