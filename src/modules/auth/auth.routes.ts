import { NextFunction, Router, Response, Request } from 'express';
import * as controller from './auth.controller.js';
import fileUpload from 'express-fileupload';
import createHttpError from 'http-errors';

const router = Router();
router.post(
  '/register',
  fileUpload({
    limits: { fileSize: 500 * 1024 }, //500kb
    abortOnLimit: true,
    limitHandler: (req: Request, res: Response, next: NextFunction) => {
      const error = createHttpError(400, 'File size exceeds the limits');
      next(error);
    },
  }),
  controller.registerUser
);

router.post('/login', controller.loginUser);
export default router;
