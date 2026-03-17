import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../users/user.model.js';
import { Product } from '../product/product.model.js';
import orderModel from '../order/order.model.js';
import { razorpayInstance } from '../../config/razorpay.config.js';
import paymentModel from '../payment/payment.model.js';
import { OrderResponseDTO } from './dto/order-response.dto.js';
import z from 'zod';
import { OrderService } from './order.service.js';

export type CheckoutItem = {
  productId: string;
  variantId: string;
  quantity: number;
};

export type CheckoutData = {
  userId: string;
  addressId: string;
  paymentMethod: 'online' | 'cash';
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
  constructor(private orderService: OrderService) {
    this.createOrder = this.createOrder.bind(this);
    this.getAllOrders = this.getAllOrders.bind(this);
    this.getOrderDetail = this.getOrderDetail.bind(this);
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
        quantity: item.quantity,
        total: item.total,
      }));

      const pricing = {
        subtotal: totalAmount,
        discount: 0,
        tax: 0,
        shipping: 0,
        total: totalAmount,
      };

      if (paymentMethod === 'online') {
        const razorpayOrder = await razorpayInstance.orders.create({
          amount: Math.round(totalAmount * 100),
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        });

        const payment = await paymentModel.create({
          userId,
          method: 'ONLINE',
          provider: 'razorpay',
          amount: totalAmount,
          status: 'created',
          razorpayOrderId: razorpayOrder.id,
          metadata: {
            addressId,
            cartItems: cart,
          },
        });

        const order = await orderModel.create({
          userId,
          items,
          pricing,
          paymentMethod: 'ONLINE',
          paymentStatus: 'pending',
          status: 'pending',
          shippingAddress,
        });

        return res.status(201).json({
          success: true,
          paymentMethod: 'online',
          razorpayOrderId: razorpayOrder.id,
          amount: totalAmount,
          orderId: order._id,
          paymentId: payment._id,
          checkoutSnapshot: { userId, addressId, cart },
        });
      }

      if (paymentMethod === 'cash') {
        const order = await orderModel.create({
          userId,
          items,
          pricing,
          paymentMethod: 'COD',
          paymentStatus: 'pending',
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

  async getById(req: Request, res: Response) {
    try {
      const orderId = req.params.orderId as string;

      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order id',
        });
      }

      const order = await orderModel
        .findOne({
          _id: orderId,
          userId: req.user!.sub,
        })
        .populate('userId', 'firstName lastName email wishlist')
        .populate('items.productId')
        .populate('items.variantId');

      if (!order) {
        res.status(400).json({ success: false, message: 'Order not found' });
      }
      const dto = OrderResponseDTO.fromOrder(order);
      return res.status(200).json({ success: true, data: dto });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  async getMyOrders(req: Request, res: Response) {
    try {
      const order = await orderModel
        .find()
        .populate('userId', 'firstName lastName email wishlist')
        .populate('items.productId')
        .populate('items.variantId');

      if (!order || order.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: 'No orders found' });
      }

      const dto = OrderResponseDTO.fromOrderArray(order);
      return res.status(200).json({ success: true, data: dto });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: 'Internal Server Error' });
    }
  }

  async getOrderDetail(req: Request, res: Response) {
    try {
      const orderId = req.params.orderId as string;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required',
        });
      }

      const order = await this.orderService.getOrderDetails(orderId);

      return res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      if (error.message === 'Invalid order ID') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      console.error('getOrderDetails error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async getAllOrders(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const status = req.query.status as string | undefined;
      const paymentStatus = req.query.paymentStatus as string | undefined;
      const paymentMethod = req.query.paymentMethod as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await this.orderService.getAllOrders(
        page,
        limit,
        status,
        paymentStatus,
        search,
        paymentMethod
      );

      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      console.error('getAllOrders error:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Internal server error' });
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
    if (!['online', 'cash'].includes(paymentMethod)) {
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

  private userQuerySchema(data: any) {
    const schema = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(10),
      search: z.string().optional(),
      sortBy: z
        .enum(['createdAt', 'lastLogin', 'firstName', 'email'])
        .default('lastLogin'),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
      isActive: z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => {
          if (val === 'true') return true;
          if (val === 'false') return undefined;
          return undefined;
        }),
    });
    return schema.parse(data);
  }
}
