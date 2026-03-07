import express from 'express';
import rateLimit from 'express-rate-limit';
import categoryController from '../controllers/category.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { requireApproval } from '../middlewares/requireApproval';
import { validate } from '../middlewares/validate';
import { createCategorySchema, updateCategorySchema, categoryIdSchema, } from '../validations/category.validation';
import cloudinaryConfig from '../config/cloudinary';

const router = express.Router();

const providerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many category operations, please try again after an hour',
    },
});

// --- Public Routes ---
router.get('/', categoryController.getAllCategories);

// --- Protected Routes (Provider Only) ---
router.use(authenticate);
router.use(requireRole(['PROVIDER']));
router.use(requireApproval);
router.use(providerLimiter);

router.post('/', cloudinaryConfig.upload.single('image'), validate(createCategorySchema), categoryController.createCategory);
router.get('/my-categories', categoryController.getOwnCategories);

router.route('/:id')
    .get(validate(categoryIdSchema), categoryController.getCategoryById)
    .patch(validate(updateCategorySchema), categoryController.updateCategory)
    .delete(validate(categoryIdSchema), categoryController.deleteCategory);

export default router;
