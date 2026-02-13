import { NextFunction, Router, Response, Request } from 'express';
import * as controller from './auth.controller.js';
import fileUpload from 'express-fileupload';
import createHttpError from 'http-errors';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';

const router = Router();
router.post(
  '/register',
  fileUpload({
    limits: { fileSize: 500 * 1024 },
    abortOnLimit: true,
    limitHandler: (req: Request, res: Response, next: NextFunction) => {
      const error = createHttpError(400, 'File size exceeds the limits');
      next(error);
    },
  }),
  controller.registerUser
);

router.post('/login', controller.loginUser);
router.get('/self', isAuthenticate, controller.self);
router.get('/refresh', controller.refresh);
router.post('/send-otp', controller.sendVerificationOtp);
router.post('/verify-email', controller.verifyOtp);
router.post('/forgot-password', controller.sendVerificationForForgot);
router.post('/verify-reset-otp', controller.verifyOtpForForgot);
router.post('/reset-password', isAuthenticate, controller.resetPassword);
router.post('/change-password', isAuthenticate, controller.changePassword);

export default router;
