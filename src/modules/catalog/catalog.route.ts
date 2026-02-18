import { NextFunction, Router, Request, Response } from 'express';
import { CatalogController } from './catalog.controller.js';
import { isAuthorize } from '../../middleware/isAuthorize.js';
import { S3Storage } from '../../services/S3Storage.js';
import fileUpload from 'express-fileupload';
import createHttpError from 'http-errors';

const router = Router();

const storage = new S3Storage();
const catelogController = new CatalogController(storage);

router.post(
  '/',
  isAuthorize,
  fileUpload({
    limits: { fileSize: 500 * 1024 },
    abortOnLimit: true,
    limitHandler: (req: Request, res: Response, next: NextFunction) => {
      const error = createHttpError(400, 'File size exceeds the limits');
      next(error);
    },
  }),
  catelogController.createCategory
);

router.get('/', catelogController.getCategoriesByIds);
router.get('/all', catelogController.getCategories);
router.get('/:category_id', catelogController.getCategoryById);
router.put(
  '/:category_id',
  isAuthorize,
  fileUpload({
    limits: { fileSize: 500 * 1024 },
    abortOnLimit: true,
    limitHandler: (req: Request, res: Response, next: NextFunction) => {
      const error = createHttpError(400, 'File size exceeds the limits');
      next(error);
    },
  }),
  catelogController.updateCategory
);
router.delete('/:category_id', isAuthorize, catelogController.deleteCategory);

export default router;
