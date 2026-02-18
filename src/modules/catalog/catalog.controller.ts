import createHttpError from 'http-errors';
import { Request, Response } from 'express';
import { S3Storage } from '../../services/S3Storage.js';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';
import { CategoryModel } from './catalog.model.js';
import mongoose from 'mongoose';

export class CatalogController {
  constructor(private storage: S3Storage) {
    this.createCategory = this.createCategory.bind(this);
    this.getCategoryById = this.getCategoryById.bind(this);
    this.getCategoriesByIds = this.getCategoriesByIds.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.updateCategory = this.updateCategory.bind(this);
    this.deleteCategory = this.deleteCategory.bind(this);
  }
  async createCategory(req: Request, res: Response) {
    const { name, slug, url, parentId, sortOrder, metaTitle, metaDescription } =
      req.body;

    const image = req.files!.imageUrl as UploadedFile;
    const imageName = `category_${uuidv4()}`;

    await this.storage.upload({
      fileData: image.data,
      filename: imageName,
    });

    let level = 0;
    let parentIdFinal: string | null;
    if (!parentId || parentId === 'null') {
      parentIdFinal = null;
    } else {
      parentIdFinal = parentId;
    }

    let sortOrderFinal: number;
    if (sortOrder) {
      sortOrderFinal = Number(sortOrder);
    } else {
      sortOrderFinal = 0;
    }

    if (parentIdFinal) {
      const parent = await CategoryModel.findById(parentIdFinal);
      if (!parent) {
        throw createHttpError(400, 'Parent category not found');
      }
      level = parent.level + 1;
    }

    const category = await CategoryModel.create({
      name,
      slug,
      url,
      parentId: parentIdFinal || null,
      level,
      sortOrder: sortOrderFinal || 0,
      imageUrl: imageName,
      metaTitle,
      metaDescription,
    });

    return res.status(201).json(category);
  }

  async getCategoryById(req: Request, res: Response) {
    const category_id = req.params.category_id as string;

    if (!category_id) {
      throw createHttpError(400, 'Category id required');
    }
    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      throw createHttpError(400, 'Invalid category id');
    }

    const category = await CategoryModel.findById(category_id)
      .populate({
        path: 'children',
        select: 'name slug url level imageUrl sortOrder isActive',
      })
      .lean();

    const subCategories = await CategoryModel.find({
      parentId: category_id,
    }).lean();
    if (!category) {
      throw createHttpError(400, 'Categoty not found');
    }
    return res.status(200).json({
      success: true,
      message: 'Category fetched successfully',
      data: { ...category, children: subCategories },
    });
  }

  async getCategoriesByIds(req: Request, res: Response) {
    const ids = req.query.ids as string;

    if (!ids) {
      throw createHttpError(400, 'Ids query is required.');
    }

    const idsArray = ids.split(',');

    const invalidId = idsArray.find(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidId) {
      throw createHttpError(400, `Invalid category id: ${invalidId}`);
    }

    const categories = await CategoryModel.find({
      _id: { $in: idsArray },
      isActive: true,
    }).lean();

    return res.status(200).json({
      success: true,
      message: 'Categories fetched successfully',
      count: categories.length,
      data: categories,
    });
  }

  async getCategories(req: Request, res: Response) {
    const category = await CategoryModel.find()
      .populate({
        path: 'children',
        select: 'name slug url level imageUrl sortOrder isActive',
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Category fetched successfully',
      data: category,
    });
  }

  async updateCategory(req: Request, res: Response) {
    const category_id = req.params.category_id as string;

    if (!category_id) {
      throw createHttpError(400, 'Category id required');
    }
    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      throw createHttpError(400, 'Invalid category id');
    }
    const {
      name,
      slug,
      url,
      parentId,
      sortOrder,
      metaTitle,
      metaDescription,
      isActive,
    } = req.body;

    const oldCategory = await CategoryModel.findById(category_id);

    if (!oldCategory) {
      throw createHttpError(404, 'Category not found');
    }

    let imageName: string | undefined;
    let oldImage: string | undefined;

    if (req.files?.imageUrl) {
      oldImage = oldCategory?.imageUrl;
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

    const updatedCategory = await CategoryModel.findOneAndUpdate(
      { _id: category_id },
      {
        name,
        slug,
        url,
        parentId,
        level: oldCategory.level,
        sortOrder: sortOrder || 0,
        metaTitle,
        imageUrl: imageName,
        metaDescription,
        isActive: isActive ?? true,
      },
      {
        new: true,
      }
    ).lean();

    return res.status(200).json({
      success: true,
      message: 'Category created/updated successfully',
      data: updatedCategory,
    });
  }

  async deleteCategory(req: Request, res: Response) {
    const category_id = req.params.category_id as string;

    if (!category_id) {
      throw createHttpError(400, 'Category id required');
    }
    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      throw createHttpError(400, 'Invalid category id');
    }

    const category = await CategoryModel.findById(category_id);
    if (!category) {
      throw createHttpError(404, 'Category not found');
    }
    const hasChildren = await CategoryModel.exists({
      parentId: category_id,
      isActive: true,
    });

    if (hasChildren) {
      throw createHttpError(400, 'Cannot delete category. Subcategories exist');
    }

    if (category?.imageUrl) await this.storage.delete(category.imageUrl);

    // product exist if

    await CategoryModel.findByIdAndDelete(category_id, {
      isActive: false,
    });

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  }
}
