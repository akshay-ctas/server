import { Request, Response } from 'express';
import createHttpError from 'http-errors';
import { slugifyFn } from '../../utils/utils.js';
import { Product } from './product.model.js';
import { S3Storage } from '../../services/S3Storage.js';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import mongoose from 'mongoose';

export class ProductController {
  constructor(private storage: S3Storage) {
    this.createProduct = this.createProduct.bind(this);
    this.updateProduct = this.updateProduct.bind(this);
    this.getAllProducts = this.getAllProducts.bind(this);
  }

  async createProduct(req: Request, res: Response) {
    const {
      title,
      description,
      price,
      compareAtPrice,
      status,
      tags,
      sortOrder,
      categories,
      metaTitle,
      metaDescription,
      publishedAt,
    } = req.body;

    if (!title || !price || !categories || categories.length === 0) {
      throw createHttpError(400, 'title, price and category are required');
    }

    let slug = slugifyFn(title);

    const imagename = `Product_${uuidv4()}`;
    const image = req?.files!.image as UploadedFile;

    await this.storage.upload({
      fileData: image.data,
      filename: imagename,
    });

    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = new Product({
      title,
      slug,
      description,
      price,
      compareAtPrice: compareAtPrice || 0,
      status: status || 'DRAFT',
      tags: tags || [],
      sortOrder: sortOrder || 0,
      categories,
      metaTitle,
      metaDescription,
      image: imagename,
      publishedAt: status === 'ACTIVE' ? publishedAt || new Date() : undefined,
    });

    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Product successfully create ho gaya',
      data: product,
    });
  }

  async updateProduct(req: Request, res: Response) {
    const productId = req.params.productId as string;

    if (!productId) {
      throw createHttpError(400, 'productId is not found');
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw createHttpError(400, 'Invalid category id');
    }
    const {
      title,
      description,
      price,
      compareAtPrice,
      status,
      tags,
      sortOrder,
      categories,
      metaTitle,
      metaDescription,
      publishedAt,
    } = req.body;

    if (!title || !price || !categories || categories.length === 0) {
      throw createHttpError(400, 'title, price and category are required');
    }

    let slug = slugifyFn(title);

    let imageName: string | undefined;
    let oldImage: string | undefined;

    const oldProducts = await Product.findById(productId);
    if (!oldProducts) {
      throw createHttpError(400, 'Product is not found');
    }

    if (req.files?.imageUrl) {
      oldImage = oldProducts?.image;
      const image = req.files.image as UploadedFile;
      imageName = `category_${uuidv4()}`;
      await this.storage.upload({
        filename: imageName,
        fileData: image?.data,
      });
      if (oldImage) {
        await this.storage.delete(oldImage);
      }
    }
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        title,
        slug,
        description,
        price,
        compareAtPrice: compareAtPrice || 0,
        status: status || 'DRAFT',
        tags: tags || [],
        sortOrder: sortOrder || 0,
        categories,
        metaTitle,
        metaDescription,
        image: imageName,
        publishedAt:
          status === 'ACTIVE' ? publishedAt || new Date() : undefined,
      },
      { new: true, runValidators: true }
    );

    await updatedProduct?.save();

    return res.status(201).json({
      success: true,
      message: 'Product successfully create ho gaya',
      data: updatedProduct,
    });
  }

  async getAllProducts(req: Request, res: Response) {
    const { page = 1, limit = 10, search, category, status } = req.query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    if (category) {
      filter.categories = {
        $in: [new mongoose.Types.ObjectId(category as string)],
      };
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid Category ID format' });
    }
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(filter)
      .populate('categories', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalProducts = await Product.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total: totalProducts,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(totalProducts / Number(limit)),
      },
    });
  }
  async getProductById(req: Request, res: Response) {
    const productId = req.params.productId as string;
    console.log(productId);

    if (!productId) {
      throw createHttpError(400, 'productId is not found');
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw createHttpError(400, 'Invalid category id');
    }

    const product = await Product.findById(productId);
    return res.status(200).json({
      success: true,
      data: product,
    });
  }

  async deleteProduct(req: Request, res: Response) {
    const productId = req.params.productId as string;
    console.log(productId);

    if (!productId) {
      throw createHttpError(400, 'productId is not found');
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw createHttpError(400, 'Invalid category id');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw createHttpError(400, 'Product not found');
    }
    await Product.findByIdAndDelete(productId);
    if (product?.image) await this.storage.delete(product.image);

    return res.status(200).json({
      success: true,
      message: `${product?._id} product deleted`,
    });
  }
}
