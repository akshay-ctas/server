import { Request, Response } from 'express';
import orderModel from '../order/order.model.js';
import Payment from '../payment/payment.model.js';
import { User } from '../users/user.model.js';
import { CategoryModel } from '../catalog/catalog.model.js';
import { Notification } from '../notification/notification.model.js';
import { Product } from '../product/product.model.js';

export class DashboardController {
  async getOverview(req: Request, res: Response) {
    try {
      const [
        totalOrders,
        totalUsers,
        totalProducts,
        totalCategories,
        unreadNotifications,
        paidPayments,
      ] = await Promise.all([
        orderModel.countDocuments(),
        User.countDocuments(),
        Product.countDocuments({ deletedAt: null }),
        CategoryModel.countDocuments({ isActive: true }),
        Notification.countDocuments({ recipientType: 'ADMIN', isRead: false }),
        Payment.aggregate([
          { $match: { status: 'success' } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ]),
      ]);

      const ordersByStatus = await orderModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const recentOrders = await orderModel
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select('_id userId status paymentStatus pricing.total createdAt')
        .populate('userId', 'firstName lastName email')
        .lean();

      return res.status(200).json({
        success: true,
        data: {
          totals: {
            totalOrders,
            totalUsers,
            totalProducts,
            totalCategories,
            unreadNotifications,
            totalRevenue: paidPayments[0]?.amount ?? 0,
          },
          ordersByStatus,
          recentOrders,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load dashboard overview',
        error: error.message,
      });
    }
  }
}
