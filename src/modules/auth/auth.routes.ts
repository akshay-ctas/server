import { Router } from 'express';
import * as controller from './auth.controller.js';

import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isVerified } from '../../middleware/isVerified.js';

const router = Router();
router.post('/register', controller.registerUser);

router.post('/login', controller.loginUser);
router.get('/self', isAuthenticate, controller.self);
router.get('/refresh', controller.refresh);
router.post('/send-otp', controller.sendVerificationOtp);
router.post('/verify-email', controller.verifyOtp);
router.post('/forgot-password', controller.sendVerificationForForgot);
router.post('/verify-reset-otp', controller.verifyOtpForForgot);
router.post('/reset-password', isAuthenticate, controller.resetPassword);
router.post(
  '/change-password',
  isAuthenticate,
  isVerified,
  controller.changePassword
);

export default router;
