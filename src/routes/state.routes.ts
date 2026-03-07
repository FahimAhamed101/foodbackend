import { Router } from 'express';
import stateController from '../controllers/state.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

const stateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    message: {
        success: false,
        message: 'Too many requests, please try again later'
    }
});

router.use(stateLimiter);

router.get('/', stateController.getAllStates);
router.get('/search', stateController.searchStates);
router.get('/tax', stateController.getTaxByState);

export default router;
