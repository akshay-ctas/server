import { Router } from 'express';
import * as controller from './user.controller.js';

const router = Router();
router.post('/', controller.createUser);
router.get('/:email', controller.getUser);
export default router;
