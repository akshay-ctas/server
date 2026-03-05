import { Router } from 'express';
import { UserController } from './user.controller.js';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';

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

export default router;
