import { Router } from 'express';
import { upload } from './libs/multer.config.js';
import { ProductController } from './product.controller.js';
import { ProductService } from './product.service.js';

const router = Router();

const productService = new ProductService();
const productController = new ProductController(productService);
router.post('/', upload.array('files', 10), productController.create);
router.get('/', productController.get);

export default router;
