import createHttpError from 'http-errors';
import { prisma } from '../../config/prisma.js';
import { Request, Response } from 'express';
import { S3Storage } from '../../services/S3Storage.js';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from 'express-fileupload';

export class CatalogController {
  constructor(private storage: S3Storage) {
    this.createCategory = this.createCategory.bind(this);
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
      const parent = await prisma.category.findUnique({
        where: { id: parentIdFinal },
      });
      if (!parent) {
        throw createHttpError(400, 'Parent category not found');
      }
      level = parent.level + 1;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        url,
        parentId: parentIdFinal || null,
        level,
        sortOrder: sortOrderFinal || 0,
        imageUrl: imageName,
        metaTitle,
        metaDescription,
      },
    });

    return res.status(201).json(category);
  }

  async getCategories(req: Request, res: Response) {
    const { category_id } = req.params;
    
  }
}
