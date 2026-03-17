import mongoose from 'mongoose';
import orderModel from './order.model.js';
import { PipelineStage } from 'mongoose';
import buildCategoryTree from '../../utils/buildCategoryTree.js';
import { Product } from '../product/product.model.js';
import { CategoryModel } from '../catalog/catalog.model.js';

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
    if (paymentMethod) {
      matchStage.paymentMethod = paymentMethod.trim().toUpperCase();
    }
    if (search && mongoose.Types.ObjectId.isValid(search)) {
      matchStage._id = new mongoose.Types.ObjectId(search);
    }

    const titleMatchStage: PipelineStage[] =
      search && !mongoose.Types.ObjectId.isValid(search)
        ? [
            {
              $match: {
                firstProductTitle: { $regex: search, $options: 'i' },
              },
            },
          ]
        : [];

    const basePipeline: PipelineStage[] = [
      { $match: matchStage },

      { $unwind: '$items' },

      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $set: { product: { $first: '$product' } } },

      {
        $set: {
          firstImage: {
            $let: {
              vars: {
                img: {
                  $first: {
                    $sortArray: {
                      input: { $ifNull: ['$product.images', []] },
                      sortBy: { position: 1 },
                    },
                  },
                },
              },
              in: {
                url: '$$img.url',
                altText: '$$img.altText',
              },
            },
          },
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
      { $set: { user: { $first: '$user' } } },

      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          paymentStatus: { $first: '$paymentStatus' },
          paymentMethod: { $first: '$paymentMethod' },
          pricing: { $first: '$pricing' },
          createdAt: { $first: '$createdAt' },
          shippingAddress: { $first: '$shippingAddress' },
          itemCount: { $sum: 1 },
          firstItemImage: { $first: '$firstImage' },
          firstProductTitle: { $first: '$product.title' },
          user: {
            $first: {
              _id: '$user._id',
              name: '$user.name',
              email: '$user.email',
              phone: '$user.phone',
            },
          },
        },
      },

      ...titleMatchStage,
    ];

    const ordersPipeline: PipelineStage[] = [
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          status: 1,
          paymentStatus: 1,
          paymentMethod: 1,
          pricing: 1,
          shippingAddress: 1,
          createdAt: 1,
          itemCount: 1,
          firstItemImage: 1,
          firstProductTitle: 1,
          user: 1,
        },
      },
    ];

    const countPipeline: PipelineStage[] = [
      ...basePipeline,
      { $count: 'total' },
    ];

    const [orders, totalResult] = await Promise.all([
      orderModel.aggregate(ordersPipeline),
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
            { $match: { $expr: { $eq: ['$orderId', '$$orderId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $project: {
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

    const order = result[0];

    const productIds = order.items.map((item: any) => item.productId);

    const products = await Product.find(
      { _id: { $in: productIds } },
      {
        title: 1,
        slug: 1,
        tags: 1,
        variants: 1,
        images: 1,
        categories: 1,
      }
    ).lean();

    const productMap = new Map(
      products.map((product: any) => [String(product._id), product])
    );

    order.items = await Promise.all(
      order.items.map(async (item: any) => {
        const product = productMap.get(String(item.productId));

        if (!product) {
          return {
            ...item,
            productTitle: null,
            productSlug: null,
            tags: [],
            variant: null,
            image: null,
            categoryTree: [],
          };
        }

        const variant =
          product.variants?.find(
            (v: any) => String(v._id) === String(item.variantId)
          ) || null;

        const variantPrimaryImage =
          product.images?.find(
            (img: any) =>
              String(img.variantId) === String(item.variantId) &&
              img.isPrimary === true
          ) || null;

        const productPrimaryImage =
          product.images?.find((img: any) => img.isPrimary === true) || null;

        const firstImageByPosition =
          product.images
            ?.slice()
            .sort((a: any, b: any) => a.position - b.position)[0] || null;

        const selectedImage =
          variantPrimaryImage ||
          productPrimaryImage ||
          firstImageByPosition ||
          null;

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          total: item.total,
          productTitle: product.title,
          productSlug: product.slug,
          tags: product.tags || [],
          variant: variant
            ? {
                _id: variant._id,
                sku: variant.sku,
                color: variant.color,
                metalType: variant.metalType,
                stoneType: variant.stoneType,
                size: variant.size,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                stock: variant.stock,
                isAvailable: variant.isAvailable,
                weight: variant.weight,
              }
            : null,
          image: selectedImage,
        };
      })
    );

    return order;
  }
}
