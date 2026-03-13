import { Router } from 'express';
import { UserController } from './user.controller.js';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';
import { upload } from '../product/libs/multer.config.js';
import { isAuthorize } from '../../middleware/isAuthorize.js';

const router = Router();
const userController = new UserController();
router.post(
  '/:id/addresses',
  isAuthenticate,
  isVerified,
  userController.addAddress
);
router.get(
  '/:id/addresses',
  isAuthenticate,
  isVerified,
  userController.getAddresses
);

router.put(
  '/:userId/addresses/:addressId',
  isAuthenticate,
  userController.editAddress
);

router.delete(
  '/:userId/addresses/:addressId',
  isAuthenticate,
  userController.deleteAddress
);

router.get('/me', isAuthenticate, userController.getMe);
router.get('/wish', isAuthenticate, userController.getwishList);
router.patch(
  '/',
  isAuthenticate,
  isVerified,
  upload.single('avatar'),
  userController.editUser
);

router.post(
  '/wishlist/:productId',
  isAuthenticate,
  userController.toggleWishlist
);

router.post('/wishlist', isAuthenticate, userController.clearWishlist);

router.get('/', userController.getUsers);

export default router;
