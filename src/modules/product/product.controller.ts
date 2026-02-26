import { Request, Response } from 'express';
import { ProductService } from './product.service.js';
import {
  CreateProductSchema,
  productQuerySchema,
} from './product.validation.js';
import { Product } from './product.model.js';

export class ProductController {
  constructor(private productService: ProductService) {
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.editProductDetails = this.editProductDetails.bind(this);
  }
  async create(req: Request, res: Response) {
    try {
      const rawBody = this.parseBody(req.body);

      console.log(req.body);

      const validation = CreateProductSchema.safeParse(rawBody);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.error.flatten(),
        });
      }

      const imageFiles = Array.isArray(req.files) ? req.files : [];
      const imagesMeta = req.body.images ? JSON.parse(req.body.images) : [];

      const product = await this.productService.create(
        { ...validation.data, imagesMeta },
        imageFiles
      );

      return res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error: unknown) {
      console.error('ProductController.create error:', error);

      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async get(req: Request, res: Response) {
    try {
      const validatedQuery = productQuerySchema.parse(req.query);
      const result = await this.productService.getAllProducts(validatedQuery);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({
        message: 'Invalid query parameters',
        error: error.errors || error.message,
      });
    }
  }

  async editProductDetails(req: Request, res: Response) {
    try {
      const productId = req.params.productId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
      }

      const updateData = this.buildUpdateData(req.body);

      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: updatedProduct,
      });
    } catch (error: any) {
      console.error('editProductDetails error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  private buildUpdateData(body: Request['body']) {
    const {
      status,
      title,
      metaTitle,
      metaDescription,
      description,
      price,
      compareAtPrice,
      sortOrder,
      tags,
      categories,
    } = body;

    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (compareAtPrice !== undefined)
      updateData.compareAtPrice = Number(compareAtPrice);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);

    if (tags !== undefined) updateData.tags = this.parseArrayField(tags);

    if (categories !== undefined)
      updateData.categories = this.parseArrayField(categories);

    return updateData;
  }

  private parseBody(body: Request['body']) {
    return {
      ...body,
      price: Number(body.price),
      compareAtPrice: body.compareAtPrice
        ? Number(body.compareAtPrice)
        : undefined,
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
      categories: this.parseArrayField(body.categories),
      tags: this.parseArrayField(body.tags),
      variants: body.variants ? JSON.parse(body.variants) : [],
      images: undefined,
    };
  }

  private parseArrayField(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value as string);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [value as string];
    }
  }
}
