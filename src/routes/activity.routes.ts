import express from 'express';
import activityLogController from '../controllers/activityLog.controller';
import { authenticate } from '../middlewares/authenticate';

const router = express.Router();

router.use(authenticate);

router.get('/', activityLogController.getRecentActivities);

export default router;
