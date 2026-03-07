import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { UserRole } from '../models/user.model';
import complianceController from '../controllers/compliance.controller';

const router = express.Router();

// Only Admins can manage compliance
router.use(authenticate, requireRole([UserRole.ADMIN]));

router.get('/violations', complianceController.getViolations);
router.patch('/violations/:id', complianceController.takeAction);

export default router;
