/* eslint-disable prettier/prettier */
import { NextFunction, Response, Request, Router } from 'express';
import { ProductController } from './product.controller.js';
import { S3Storage } from '../../services/S3Storage.js';
import fileUpload from 'express-fileupload';
import createHttpError from 'http-errors';
import { isAuthorize } from '../../middleware/isAuthorize.js';

const router = Router();

const storage = new S3Storage();

const productController = new ProductController(storage);

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
  productController.createProduct
);
router.put(
  '/:productId',
  isAuthorize,
  fileUpload({
    limits: { fileSize: 500 * 1024 },
    abortOnLimit: true,
    limitHandler: (req: Request, res: Response, next: NextFunction) => {
      const error = createHttpError(400, 'File size exceeds the limits');
      next(error);
    },
  }),
  productController.updateProduct
);

router.get(
  '/',
  productController.getAllProducts);

  router.get('/:productId', productController.getProductById);
  router.delete('/:productId', productController.deleteProduct);

export default router;
