import express from 'express';
import rateLimit from 'express-rate-limit';
import customerOrderController from '../controllers/customerOrder.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';

const router = express.Router();

const orderListLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, 
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many requests, please try again later'
    }
});

router.use(authenticate);
router.use(requireRole(['CUSTOMER']));
router.use(orderListLimiter);

router.get('/current', customerOrderController.getCurrentOrders);
router.get('/previous', customerOrderController.getPreviousOrders);

export default router;
