import express from 'express';
import rateLimit from 'express-rate-limit';
import feedController from '../controllers/feed.controller';
import { validate } from '../middlewares/validate';
import { getFeedSchema } from '../validations/feed.validation';

const router = express.Router();

const feedLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many feed requests, please try again later',
    },
});

router.use(feedLimiter);
router.get('/', validate(getFeedSchema), feedController.getFeed);

export default router;
