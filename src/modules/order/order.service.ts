import mongoose from 'mongoose';
import orderModel from './order.model.js';
import { PipelineStage } from 'mongoose';

export class OrderService {
  async getAllOrders(
    page: number = 1,
    limit: number = 10,
    status?: string,
    paymentStatus?: string,
    search?: string,
    paymentMethod?: string
  ) {
    const skip = (page - 1) * limit;

    const matchStage: any = {};

    if (status) matchStage.status = status;
    if (paymentStatus) matchStage.paymentStatus = paymentStatus;
    if (paymentMethod) matchStage.paymentMethod = paymentMethod;

    const basePipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $set: {
          firstItem: { $first: { $ifNull: ['$items', []] } },
          itemCount: { $size: { $ifNull: ['$items', []] } },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'firstItem.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $set: {
          product: { $first: '$product' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $set: {
          user: { $first: '$user' },
        },
      },
      {
        $set: {
          firstImage: {
            $let: {
              vars: {
                variantImage: {
                  $first: {
                    $filter: {
                      input: { $ifNull: ['$product.images', []] },
                      as: 'img',
                      cond: {
                        $eq: ['$$img._id', '$firstItem.variantId'],
                      },
                    },
                  },
                },
                primaryImage: {
                  $first: {
                    $filter: {
                      input: { $ifNull: ['$product.images', []] },
                      as: 'img',
                      cond: {
                        $eq: ['$$img.isPrimary', true],
                      },
                    },
                  },
                },
                firstImageFromArray: {
                  $first: { $ifNull: ['$product.images', []] },
                },
              },
              in: {
                $ifNull: [
                  '$$variantImage',
                  {
                    $ifNull: ['$$primaryImage', '$$firstImageFromArray'],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          pricing: 1,
          createdAt: 1,
          shippingAddress: 1,
          firstItemImage: '$firstImage',
          firstProductTitle: '$product.title',
          itemCount: '$itemCount',
          user: {
            _id: '$user._id',
            email: '$user.email',
            phone: '$user.phone',
          },
        },
      },
    ];
    if (search && !mongoose.Types.ObjectId.isValid(search)) {
      basePipeline.push({
        $match: { firstProductTitle: { $regex: search, $options: 'i' } },
      });
    }

    const orderPipeline: PipelineStage[] = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];
    const countPipeline: PipelineStage[] = [
      ...basePipeline,
      { $count: 'total' },
    ];
    const [orders, totalResult] = await Promise.all([
      orderModel.aggregate(orderPipeline),
      orderModel.aggregate(countPipeline),
    ]);

    const total = totalResult[0]?.total || 0;
    return {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
  async getOrderDetails(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error('Invalid order ID');
    }

    const pipeline: PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(orderId) } },

      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $set: { user: { $first: '$user' } } },
      {
        $lookup: {
          from: 'payments',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$orderId', '$$orderId'],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $project: {
                _id: 1,
                method: 1,
                status: 1,
                amount: 1,
                currency: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          as: 'latestPayment',
        },
      },
      {
        $unwind: {
          path: '$items',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'products',
          let: {
            productId: '$items.productId',
            variantId: '$items.variantId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$_id', '$$productId'],
                },
              },
            },
            {
              $project: {
                title: 1,
                slug: 1,
                tags: 1,
                variants: 1,
                images: 1,
                categories: 1,
              },
            },
          ],
          as: 'items.productData',
        },
      },
      {
        $set: {
          'items.productData': {
            $first: '$items.productData',
          },
        },
      },
      {
        $set: {
          'items.variant': {
            $let: {
              vars: {
                matched: {
                  $filter: {
                    input: {
                      $ifNull: ['$items.productData.variants', []],
                    },
                    as: 'v',
                    cond: {
                      $eq: ['$items.variantId', '$$v._id'],
                    },
                  },
                },
              },
              in: {
                $first: '$$matched',
              },
            },
          },
        },
      },
      {
        $set: {
          'items.image': {
            $let: {
              vars: {
                variantImage: {
                  $first: {
                    $filter: {
                      input: {
                        $ifNull: ['$items.productData.images', []],
                      },
                      as: 'img',
                      cond: {
                        $eq: ['$$img._id', '$items.variantId'],
                      },
                    },
                  },
                },
                primaryImage: {
                  $first: {
                    $filter: {
                      input: {
                        $ifNull: ['$items.productData.images', []],
                      },
                      as: 'img',
                      cond: {
                        $eq: ['$$img.isPrimary', true],
                      },
                    },
                  },
                },
                firstImageFromArray: {
                  $first: {
                    $ifNull: ['$items.productData.images', []],
                  },
                },
              },
              in: {
                $ifNull: [
                  '$$variantImage',
                  {
                    $ifNull: ['$$primaryImage', '$$firstImageFromArray'],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $set: {
          'items.productTitle': {
            $ifNull: ['$items.productData.title', null],
          },
          'items.productSlug': {
            $ifNull: ['$items.productData.slug', null],
          },
          'items.tags': {
            $ifNull: ['$items.productData.tags', []],
          },
          'items.variant': {
            $cond: {
              if: { $not: ['$items.variant'] },
              then: null,
              else: {
                _id: '$items.variant._id',
                sku: '$items.variant.sku',
                color: '$items.variant.color',
                metalType: '$items.variant.metalType',
                stoneType: '$items.variant.stoneType',
                size: '$items.variant.size',
                price: '$items.variant.price',
                stock: '$items.variant.stock',
                isAvailable: '$items.variant.isAvailable',
                weight: '$items.variant.weight',
              },
            },
          },
        },
      },
      {
        $unset: 'items.productData',
      },
      {
        $group: {
          _id: '$_id',
          user: { $first: '$user' },
          items: { $push: '$items' },
          pricing: { $first: '$pricing' },
          statusHistory: { $first: '$statusHistory' },
          paymentMethod: { $first: '$paymentMethod' },
          paymentStatus: { $first: '$paymentStatus' },
          status: { $first: '$status' },
          shippingAddress: { $first: '$shippingAddress' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          latestPayment: { $first: '$latestPayment' },
        },
      },
      {
        $project: {
          user: {
            _id: '$user._id',
            firstName: '$user.firstName',
            lastName: '$user.lastName',
            email: '$user.email',
            phone: '$user.phone',
            avatar: '$user.avatar',
          },
          items: 1,
          pricing: 1,
          statusHistory: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          status: 1,
          shippingAddress: 1,
          createdAt: 1,
          updatedAt: 1,
          latestPayment: { $first: '$latestPayment' },
        },
      },
    ];

    const result = await orderModel.aggregate(pipeline);

    if (!result.length) {
      throw new Error('Order not found');
    }

    return result[0];
  }
}
