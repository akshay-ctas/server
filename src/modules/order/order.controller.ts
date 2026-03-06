import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { User } from '../users/user.model.js';
import { Product } from '../product/product.model.js';
import orderModel from '../order/order.model.js';
import { razorpayInstance } from '../../config/razorpay.config.js';
import crypto from 'crypto';

export type CheckoutItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type CheckoutData = {
  userId: string;
  addressId: string;
  paymentMethod: 'razorpay' | 'cash';
  cart: CheckoutItem[];
};

export type VerifiedCartItem = {
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  slug: string;
  image: string;
  sku: string;
  attributes: {
    color?: string;
    size?: string;
    metalType?: string;
  };
  price: number;
  total: number;
};

type VerifyCartResult = {
  verifiedCart: VerifiedCartItem[];
  totalAmount: number;
};

export class OrderController {
  constructor() {
    this.createOrder = this.createOrder.bind(this);
  }

  async createOrder(req: Request, res: Response) {
    try {
      const data: CheckoutData = req.body;
      this.validateCheckoutData(data);

      const { userId, addressId, paymentMethod, cart } = data;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: 'User not found.' });
      }

      const address = user.addresses.find(
        (addr: any) => addr._id.toString() === addressId
      );
      if (!address) {
        return res
          .status(404)
          .json({ success: false, error: 'Address not found.' });
      }

      const { verifiedCart, totalAmount } = await this.verifyCartPrices(cart);

      const shippingAddress = {
        fullName: address.fullName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        country: address.country,
        zipCode: address.zipCode,
        phone: address.phone,
      };

      const items = verifiedCart.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        title: item.title,
        slug: item.slug,
        image: item.image,
        sku: item.sku,
        attributes: item.attributes,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }));

      const pricing = {
        subtotal: totalAmount,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: totalAmount,
      };

      if (paymentMethod === 'razorpay') {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        });

        return res.status(201).json({
          success: true,
          paymentMethod: 'razorpay',
          razorpayOrderId: razorpayOrder.id,
          amount: totalAmount,
          checkoutSnapshot: { userId, addressId, cart },
        });
      }

      if (paymentMethod === 'cash') {
        console.log(paymentMethod, {
          userId,
          items,
          pricing,
          payment: {
            method: 'COD',
            status: 'pending',
          },
          status: 'confirmed',
          shippingAddress,
        });
        const order = await orderModel.create({
          userId,
          items,
          pricing,
          payment: {
            method: 'COD',
            status: 'pending',
          },
          status: 'confirmed',
          shippingAddress,
        });

        return res.status(201).json({
          success: true,
          paymentMethod: 'cash',
          orderId: order._id,
          amount: totalAmount,
        });
      }
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  private async verifyCartPrices(
    cart: CheckoutItem[]
  ): Promise<VerifyCartResult> {
    const verifiedCart: VerifiedCartItem[] = [];
    let totalAmount = 0;

    for (const item of cart) {
      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      const variant = product.variants.find(
        (v: any) => v._id.toString() === item.variantId
      );
      if (!variant) {
        throw new Error(`Variant not found: ${item.variantId}`);
      }

      if (variant.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.title}". Available: ${variant.stock}`
        );
      }
      const variantImage = product.images.find(
        (p: any) => p.variantId?.toString() === variant._id.toString()
      );

      const price = parseFloat(variant.price.toString());
      const total = price * item.quantity;
      totalAmount += total;

      verifiedCart.push({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        title: product.title,
        slug: product.slug,
        image: variantImage?.url ?? product.images?.[0]?.url ?? '',
        sku: variant.sku,
        attributes: {
          color: variant.color,
          size: variant.size,
          metalType: variant.metalType,
        },
        price,
        total,
      });
    }

    return { verifiedCart, totalAmount };
  }

  private validateCheckoutData(data: CheckoutData) {
    const { userId, addressId, paymentMethod, cart } = data;
    if (!userId || !addressId || !paymentMethod || !cart) {
      throw new Error('Missing required fields.');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid userId.');
    }
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      throw new Error('Invalid addressId.');
    }
    if (!['razorpay', 'cash'].includes(paymentMethod)) {
      throw new Error('Invalid payment method.');
    }
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error('Cart cannot be empty.');
    }
    for (const item of cart) {
      if (!item.productId || !item.variantId || !item.quantity) {
        throw new Error('Cart item missing required fields.');
      }
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        throw new Error(`Invalid productId: ${item.productId}`);
      }
      if (!mongoose.Types.ObjectId.isValid(item.variantId)) {
        throw new Error(`Invalid variantId: ${item.variantId}`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error(`Invalid quantity for productId: ${item.productId}`);
      }
    }
  }
}
