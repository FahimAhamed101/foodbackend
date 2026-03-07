import express from 'express';
import rateLimit from 'express-rate-limit';
import bannerController from '../controllers/banner.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { UserRole } from '../models/user.model';
import {
    createBannerSchema,
    updateBannerSchema,
    getBannersQuerySchema
} from '../validations/banner.validation';

const router = express.Router();

const bannerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased for development (change to 10 in production)
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

router.use(bannerLimiter);

// 1. PUBLIC OR SHARED ROUTES (TOKEN REQUIRED)
router.get('/active', bannerController.getActiveBanners);

router.use(authenticate);

// Allow all authenticated users (Admin, Provider, Customer) to list banners
router.get('/', validate(getBannersQuerySchema), bannerController.listAllBanners);

// 2. ADMIN ONLY MANAGEMENT ROUTES
router.use(requireRole([UserRole.ADMIN]));

router.post('/', validate(createBannerSchema), bannerController.createBanner);
router.patch('/:id', validate(updateBannerSchema), bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);

export default router;
