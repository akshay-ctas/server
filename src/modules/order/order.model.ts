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

  title: String,
  slug: String,
  image: String,
  sku: String,

  attributes: {
    color: String,
    size: String,
    metalType: String,
  },

  quantity: {
    type: Number,
    required: true,
  },

  price: {
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

    payment: {
      method: {
        type: String,
        enum: ['COD', 'ONLINE'],
      },

      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },

      razorpayOrderId: String,
      razorpayPaymentId: String,
      razorpaySignature: String,
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
