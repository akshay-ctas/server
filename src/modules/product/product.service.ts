import mongoose from 'mongoose';
import { CreateProductInput, ProductQueryType } from './product.validation.js';
import { s3Service } from './libs/s3.service.js';
import { Product } from './product.model.js';
import { CategoryModel } from '../catalog/catalog.model.js';

type ImageMeta = {
  variantSku?: string;
  altText?: string;
  isPrimary?: boolean;
};

export type CreateProductPayload = CreateProductInput & {
  imagesMeta?: ImageMeta[];
};

export class ProductService {
  async create(data: CreateProductPayload, imageFiles: Express.Multer.File[]) {
    await this.checkSlugUnique(data.slug);
    await this.checkCategoriesValid(data.categories);
    await this.checkSkusUnique(data.variants.map((v) => v.sku));

    if (data.status === 'ACTIVE') {
      if (!data.variants.length)
        throw new Error('Cannot activate product without variants');

      if (!imageFiles.length)
        throw new Error('Cannot activate product without images');
    }

    const uploadedUrls =
      imageFiles.length > 0
        ? await s3Service.uploadMany(imageFiles, 'products')
        : [];

    const product = new Product({
      title: data.title,
      slug: data.slug,
      description: data.description,
      price: this.toDecimal(data.price),
      compareAtPrice: data.compareAtPrice
        ? this.toDecimal(data.compareAtPrice)
        : undefined,
      status: data.status,
      tags: data.tags,
      sortOrder: data.sortOrder,
      categories: data.categories.map((id) => new mongoose.Types.ObjectId(id)),
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
      variants: data.variants.map((v) => ({
        ...v,
        price: this.toDecimal(v.price),
        compareAtPrice: v.compareAtPrice
          ? this.toDecimal(v.compareAtPrice)
          : undefined,
      })),
    });

    product.images = uploadedUrls.map((url, i) => {
      const meta = data.imagesMeta?.[i];
      const matchedVariant = meta?.variantSku
        ? product.variants.find((v) => v.sku === meta.variantSku)
        : undefined;

      return {
        url,
        altText: meta?.altText,
        position: i,
        isPrimary: meta?.isPrimary ?? i === 0,
        variantId: matchedVariant?._id,
      };
    });

    await product.save();
    return product;
  }

  async getAllProducts(query: ProductQueryType) {
    const { page, limit, search, status, category, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categories')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async checkSlugUnique(slug: string) {
    const exists = await Product.findOne({ slug });
    if (exists) throw new Error(`Slug "${slug}" already exists`);
  }

  private async checkCategoriesValid(categoryIds: string[]) {
    const objectIds = categoryIds.map((id) => new mongoose.Types.ObjectId(id));
    const found = await CategoryModel.countDocuments({
      _id: { $in: objectIds },
      isActive: true,
    });
    if (found !== objectIds.length)
      throw new Error('One or more categories are invalid or inactive');
  }

  private async checkSkusUnique(skus: string[]) {
    if (skus.length === 0) return;

    const hasDuplicate = skus.length !== new Set(skus).size;
    if (hasDuplicate) throw new Error('Duplicate SKUs in variants');

    const existing = await Product.findOne({ 'variants.sku': { $in: skus } });
    if (existing) throw new Error('One or more SKUs already exist');
  }

  private toDecimal(value: number) {
    return mongoose.Types.Decimal128.fromString(String(value));
  }
}
