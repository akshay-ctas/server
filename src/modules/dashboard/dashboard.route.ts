import { Router } from 'express';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import { isAuthorize } from '../../middleware/isAuthorize.js';
import { DashboardController } from './dashboard.controller.js';

const router = Router();
const dashboardController = new DashboardController();

router.get('/overview', isAuthenticate, isAuthorize, dashboardController.getOverview);

export default router;

