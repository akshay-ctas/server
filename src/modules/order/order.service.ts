import mongoose from 'mongoose';
import orderModel from './order.model.js';
import buildCategoryTree from '../../utils/buildCategoryTree.js';
import { PipelineStage } from 'mongoose';

export class OrderService {
  async getAllOrdersAdmin(
    page: number = 1,
    limit: number = 10,
    status?: string,
    paymentStatus?: string,
    search?: string
  ) {
    const skip = (page - 1) * limit;

    const matchStage: any = {};
    if (status) matchStage.status = status;
    if (paymentStatus) matchStage.paymentStatus = paymentStatus;
    if (search && mongoose.Types.ObjectId.isValid(search)) {
      matchStage._id = new mongoose.Types.ObjectId(search);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },

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
            $first: {
              $sortArray: {
                input: { $ifNull: ['$product.images', []] },
                sortBy: { position: 1 },
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
          shippingAddress: { $first: '$shippingAddress' },
          createdAt: { $first: '$createdAt' },
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

      { $sort: { createdAt: -1 } },

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

    const [orders, total] = await Promise.all([
      orderModel.aggregate(pipeline),
      orderModel.countDocuments(matchStage),
    ]);

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
  //   async getOrderDetails(orderId: string) {
  //     if (!mongoose.Types.ObjectId.isValid(orderId)) {
  //       throw new Error('Invalid order ID');
  //     }

  //     const pipeline = [
  //       { $match: { _id: new mongoose.Types.ObjectId(orderId) } },

  //       {
  //         $lookup: {
  //           from: 'payments',
  //           let: { orderId: '$_id' },
  //           pipeline: [
  //             { $match: { $expr: { $eq: ['$orderId', '$$orderId'] } } },
  //             { $sort: { createdAt: -1 } },
  //             { $limit: 1 },
  //             {
  //               $project: {
  //                 method: 1,
  //                 status: 1,
  //                 amount: 1,
  //                 currency: 1,
  //                 createdAt: 1,
  //                 updatedAt: 1,
  //               },
  //             },
  //           ],
  //           as: 'latestPayment',
  //         },
  //       },
  //       { $set: { latestPayment: { $first: '$latestPayment' } } },

  //       { $unwind: '$items' },

  //       {
  //         $lookup: {
  //           from: 'products',
  //           localField: 'items.productId',
  //           foreignField: '_id',
  //           as: 'product',
  //         },
  //       },
  //       { $set: { product: { $first: '$product' } } },

  //       // Find matched variant
  //       {
  //         $set: {
  //           variant: {
  //             $first: {
  //               $filter: {
  //                 input: { $ifNull: ['$product.variants', []] }, // ✅ null guard
  //                 as: 'v',
  //                 cond: { $eq: ['$$v._id', '$items.variantId'] },
  //               },
  //             },
  //           },
  //         },
  //       },

  //       // Image fields — null guard on product.images
  //       {
  //         $set: {
  //           variantPrimaryImage: {
  //             $first: {
  //               $filter: {
  //                 input: { $ifNull: ['$product.images', []] }, // ✅ null guard
  //                 as: 'img',
  //                 cond: {
  //                   $and: [
  //                     { $eq: ['$$img.variantId', '$items.variantId'] },
  //                     { $eq: ['$$img.isPrimary', true] },
  //                   ],
  //                 },
  //               },
  //             },
  //           },
  //           productPrimaryImage: {
  //             $first: {
  //               $filter: {
  //                 input: { $ifNull: ['$product.images', []] }, // ✅ null guard
  //                 as: 'img',
  //                 cond: { $eq: ['$$img.isPrimary', true] },
  //               },
  //             },
  //           },
  //           firstImageByPosition: {
  //             $first: {
  //               $sortArray: {
  //                 input: { $ifNull: ['$product.images', []] }, // ✅ null guard
  //                 sortBy: { position: 1 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       {
  //         $set: {
  //           selectedImage: {
  //             $ifNull: [
  //               '$variantPrimaryImage',
  //               { $ifNull: ['$productPrimaryImage', '$firstImageByPosition'] },
  //             ],
  //           },
  //         },
  //       },

  //       // Category path construction
  //       {
  //         $unwind: {
  //           path: '$product.categories',
  //           preserveNullAndEmptyArrays: true,
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'categories',
  //           localField: 'product.categories',
  //           foreignField: '_id',
  //           as: 'leafCategory',
  //         },
  //       },
  //       { $set: { leafCategory: { $first: '$leafCategory' } } },
  //       {
  //         $graphLookup: {
  //           from: 'categories',
  //           startWith: '$leafCategory.parentId',
  //           connectFromField: 'parentId',
  //           connectToField: '_id',
  //           as: 'ancestors',
  //         },
  //       },
  //       {
  //         $set: {
  //           categoryPath: {
  //             $cond: {
  //               // ✅ leafCategory null ho toh empty array do
  //               if: { $eq: ['$leafCategory', null] },
  //               then: [],
  //               else: {
  //                 $concatArrays: [
  //                   {
  //                     $map: {
  //                       input: {
  //                         $sortArray: {
  //                           input: { $ifNull: ['$ancestors', []] }, // ✅ null guard
  //                           sortBy: { level: 1 },
  //                         },
  //                       },
  //                       as: 'anc',
  //                       in: { _id: '$$anc._id', name: '$$anc.name' },
  //                     },
  //                   },
  //                   [{ _id: '$leafCategory._id', name: '$leafCategory.name' }],
  //                 ],
  //               },
  //             },
  //           },
  //         },
  //       },

  //       // Group by orderId + itemId
  //       {
  //         $group: {
  //           _id: { orderId: '$_id', itemId: '$items._id' },
  //           orderRoot: { $first: '$$ROOT' },
  //           categoryPaths: { $addToSet: '$categoryPath' },
  //         },
  //       },
  //       {
  //         $set: {
  //           'orderRoot.items.categoryPaths': '$categoryPaths',
  //         },
  //       },
  //       { $replaceRoot: { newRoot: '$orderRoot' } },

  //       // Group all items back into single order
  //       {
  //         $group: {
  //           _id: '$_id',
  //           userId: { $first: '$userId' },
  //           items: {
  //             $push: {
  //               productId: '$items.productId',
  //               variantId: '$items.variantId',
  //               quantity: '$items.quantity',
  //               total: '$items.total',
  //               productTitle: '$product.title',
  //               productSlug: '$product.slug',
  //               tags: '$product.tags',
  //               categoryPaths: '$items.categoryPaths',
  //               variant: {
  //                 _id: '$variant._id',
  //                 sku: '$variant.sku',
  //                 color: '$variant.color',
  //                 metalType: '$variant.metalType',
  //                 stoneType: '$variant.stoneType',
  //                 size: '$variant.size',
  //                 price: '$variant.price',
  //                 compareAtPrice: '$variant.compareAtPrice',
  //                 stock: '$variant.stock',
  //                 isAvailable: '$variant.isAvailable',
  //                 weight: '$variant.weight',
  //               },
  //               image: '$selectedImage',
  //             },
  //           },
  //           pricing: { $first: '$pricing' },
  //           paymentMethod: { $first: '$paymentMethod' },
  //           paymentStatus: { $first: '$paymentStatus' },
  //           status: { $first: '$status' },
  //           shippingAddress: { $first: '$shippingAddress' },
  //           createdAt: { $first: '$createdAt' },
  //           updatedAt: { $first: '$updatedAt' },
  //           latestPayment: { $first: '$latestPayment' },
  //         },
  //       },

  //       {
  //         $project: {
  //           _id: 1,
  //           userId: 1,
  //           items: 1,
  //           pricing: 1,
  //           paymentMethod: 1,
  //           paymentStatus: 1,
  //           status: 1,
  //           shippingAddress: 1,
  //           createdAt: 1,
  //           updatedAt: 1,
  //           latestPayment: 1,
  //         },
  //       },
  //     ];

  //     const result = await orderModel.aggregate(pipeline);

  //     if (result.length === 0) {
  //       throw new Error('Order not found');
  //     }

  //     const order = result[0];

  //     order.items = order.items.map((item: any) => {
  //       const validPaths = (item.categoryPaths || []).filter(
  //         (path: any[]) => path && path.length > 0 // ✅ empty paths filter karo
  //       );
  //       const categoryTree = buildCategoryTree(validPaths);
  //       const { categoryPaths, ...rest } = item;
  //       return { ...rest, categoryTree };
  //     });

  //     return order;
  //   }
}
