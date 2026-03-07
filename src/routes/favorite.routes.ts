import express from 'express';
import rateLimit from 'express-rate-limit';
import favoriteController from '../controllers/favorite.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { createFavoriteSchema, removeFavoriteSchema, getFeedSchema } from '../validations/favorite.validation';

const router = express.Router();

const favoriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many favorite requests, please try again later',
    },
});

router.use(authenticate);
router.use(favoriteLimiter);

router.post('/', requireRole(['CUSTOMER']), validate(createFavoriteSchema), favoriteController.addFavorite);
router.get('/feed', requireRole(['CUSTOMER']), validate(getFeedSchema), favoriteController.getFavoriteFeed);
router.delete('/:foodId', requireRole(['CUSTOMER']), validate(removeFavoriteSchema), favoriteController.removeFavorite);

export default router;
