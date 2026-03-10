import express from 'express';
import rateLimit from 'express-rate-limit';
import foodController from '../controllers/food.controller';
import favoriteController from '../controllers/favorite.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { requireApproval } from '../middlewares/requireApproval';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';
import {
    createFoodSchema,
    updateFoodSchema,
    foodIdSchema,
    foodByCategorySchema,
    getFoodsQuerySchema,
} from '../validations/food.validation';

const router = express.Router();

const foodOpsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many food management operations, please try again after 15 minutes',
    },
});

// Public Route
router.get('/search', foodController.searchFoods);

router.use(authenticate);
router.use(requireRole(['PROVIDER']));
router.use(requireApproval);
router.use(foodOpsLimiter);

// Create food - requires multipart/form-data image upload
router.post('/', upload.single('image'), validate(createFoodSchema), foodController.createFood);

// Get own foods
router.get('/', validate(getFoodsQuerySchema), foodController.getOwnFoods);

// Get foods by category
router.get('/category/:categoryId', validate(foodByCategorySchema), foodController.getFoodsByCategory);

// Get, update, delete food by ID
router.route('/:id')
    .get(validate(foodIdSchema), foodController.getFoodById)
    // Optional image replacement via multipart/form-data
    .patch(upload.single('image'), validate(updateFoodSchema), foodController.updateFood)
    .delete(validate(foodIdSchema), foodController.deleteFood);
router.get('/:foodId/stats', requireRole(['PROVIDER']), favoriteController.getFoodStats);

export default router;
