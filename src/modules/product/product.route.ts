import { Router } from 'express';
import { upload } from './libs/multer.config.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

const router = Router();

const productService = new ProductService();
const productController = new ProductController(productService);
router.post('/', upload.array('files', 10), productController.create);
router.get('/all', productController.get);
router.get('/', productController.getProductsByCategories);
router.get('/search', productController.getProductBySearchFilter);
router.get('/:slug', productController.getProductBySlug);

router.patch('/:productId', productController.editProductDetails);
router.patch('/:productId/variants/:variantId', productController.editVariant);
router.post(
  '/:productId/variants/:variantId/images',
  upload.array('images', 10),
  productController.addImages
);
router.patch(
  '/:productId/variants/:variantId/images/:imageId/set-primary',
  productController.setPrimaryImage
);

router.delete(
  '/:productId/variants/:variantId/images/:imageId/delete',
  productController.deleteImage
);

router.delete(
  '/:productId/variants/:variantId',
  productController.deleteVariant
);

router.delete('/:productId', productController.deleteProduct);

export default router;
