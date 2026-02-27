import { Request, Response } from 'express';
import { ProductService } from './product.service.js';
import {
  CreateProductSchema,
  productQuerySchema,
} from './product.validation.js';
import { Product } from './product.model.js';
import { s3Service } from './libs/s3.service.js';
import mongoose from 'mongoose';

export class ProductController {
  constructor(private productService: ProductService) {
    this.create = this.create.bind(this);
    this.get = this.get.bind(this);
    this.editProductDetails = this.editProductDetails.bind(this);
    this.editVariant = this.editVariant.bind(this);
    this.addImages = this.addImages.bind(this);
  }
  async create(req: Request, res: Response) {
    try {
      const rawBody = this.parseBody(req.body);

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
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
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
  async setPrimaryImage(req: Request, res: Response) {
    try {
      const { productId, variantId, imageId } = req.params;

      if (!productId || !variantId || !imageId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, Variant ID, and Image ID are required',
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      product.images = product.images.map((img: any) => {
        if (img.variantId.toString() === variantId) {
          return {
            ...img.toObject(),
            isPrimary: img._id.toString() === imageId,
          };
        }
        return img;
      });

      await product.save();

      return res.status(200).json({
        success: true,
        message: `${imageId} set as new Primary Image`,
      });
    } catch (error: any) {
      console.error('setPrimaryImage error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
  async deleteVariant(req: Request, res: Response) {
    try {
      const { productId, variantId } = req.params;

      if (!productId || !variantId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and Variant ID are required',
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      const variantImages = product.images.filter(
        (img) => img.variantId?.toString() === variantId
      );
      const variantImageUrls = variantImages.map((img) => img.url);
      if (variantImageUrls.length > 0) {
        await s3Service.deleteMany(variantImageUrls);
      }

      product.variants = product.variants.filter(
        (v) => v._id.toString() !== variantId
      );
      product.images = product.images.filter(
        (img) => img.variantId?.toString() !== variantId
      );

      await product.save();

      return res.status(200).json({
        success: true,
        message: 'Variant and associated images deleted successfully',
      });
    } catch (error: any) {
      console.error('deleteVariant error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
  async deleteImage(req: Request, res: Response) {
    try {
      const { productId, variantId, imageId } = req.params;

      if (!productId || !variantId || !imageId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID, Variant ID, and Image ID are required',
        });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: 'Product not found' });
      }

      const imageToDelete = product.images.find(
        (img) =>
          img.variantId?.toString() === variantId &&
          img._id?.toString() === imageId
      );
      if (!imageToDelete) {
        return res
          .status(404)
          .json({ success: false, message: 'Image not found' });
      }

      await s3Service.delete(imageToDelete.url);

      const updatedVariantImages = product.images
        .filter(
          (img) =>
            img.variantId?.toString() === variantId &&
            img._id?.toString() !== imageId
        )
        .sort((a, b) => a.position - b.position);

      if (
        updatedVariantImages.length > 0 &&
        !updatedVariantImages.some((img) => img.isPrimary)
      ) {
        updatedVariantImages[0].isPrimary = true;
      }

      // Reset positions
      updatedVariantImages.forEach((img, index) => {
        img.position = index + 1;
      });

      product.images = [...updatedVariantImages];

      await product.save();

      return res.status(200).json({
        success: true,
        message: 'Image deleted successfully, positions updated',
      });
    } catch (error: any) {
      console.error('deleteImage error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
  async addImages(req: Request, res: Response) {
    try {
      const { productId, variantId } = req.params;

      if (!productId || !variantId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and Variant ID are required',
        });
      }

      const imageFiles = Array.isArray(req.files) ? req.files : [];

      if (!imageFiles.length) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
        });
      }

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const uploadedUrls =
        imageFiles.length > 0
          ? await s3Service.uploadMany(imageFiles, 'products')
          : [];

      const existingVariantImages =
        product.images?.filter(
          (img: any) => img.variantId.toString() === variantId
        ) || [];

      const maxPosition =
        existingVariantImages.length > 0
          ? Math.max(...existingVariantImages.map((i: any) => i.position))
          : -1;

      const newImages = uploadedUrls.map((url: string, index: number) => ({
        variantId: new mongoose.Types.ObjectId(variantId as string),
        url,
        position: maxPosition + 1 + index,
        isPrimary: existingVariantImages.length === 0 && index === 0,
        altText: '',
      }));

      product.images.push(...newImages);

      await product.save();

      return res.status(200).json({
        success: true,
        message: 'Images received successfully',
        count: imageFiles.length,
      });
    } catch (error: any) {
      console.error('editProductVariants error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async editVariant(req: Request, res: Response) {
    try {
      const productId = req.params.productId;
      const variantId = req.params.variantId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
      }
      if (!variantId) {
        return res.status(400).json({
          success: false,
          message: 'Variant ID is required',
        });
      }

      const bodyData = this.buildVeriantData(req.body);

      const setData: any = {};
      Object.keys(bodyData).forEach((key) => {
        setData[`variants.$.${key}`] = bodyData[key];
      });

      const updatedVariant = await Product.updateOne(
        { _id: productId, 'variants._id': variantId },
        { $set: setData }
      );

      if (updatedVariant.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Product Variants updated successfully',
        data: updatedVariant,
      });
    } catch (error: any) {
      console.error('editProductVariants error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  private buildVeriantData(body: Request['body']) {
    const { color, metalType, price, size, stock, stoneType, sku } = body;

    const updateVariant: any = {};

    if (color !== undefined) updateVariant.color = color;
    if (metalType !== undefined) updateVariant.metalType = metalType;
    if (price !== undefined) updateVariant.price = price;
    if (size !== undefined) updateVariant.size = size;
    if (stock !== undefined) updateVariant.stock = stock;
    if (stoneType !== undefined) updateVariant.stoneType = stoneType;
    if (sku !== undefined) updateVariant.sku = sku;

    return updateVariant;
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
