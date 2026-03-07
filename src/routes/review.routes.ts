import express from 'express';
import reviewController from '../controllers/review.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { validate } from '../middlewares/validate';
import { createReviewSchema, replyReviewSchema, getReviewsQuerySchema, updateReviewSchema } from '../validations/review.validation';

import { UserRole } from '../models/user.model';

const router = express.Router();

router.get('/provider', authenticate, requireRole(['PROVIDER']), validate(getReviewsQuerySchema), reviewController.getProviderReviews);
router.get('/provider/:providerId', validate(getReviewsQuerySchema), reviewController.getProviderReviews);
router.get('/stats', authenticate, requireRole(['PROVIDER']), reviewController.getRatingStats);
router.get('/stats/:providerId', reviewController.getRatingStats);
router.get('/all', authenticate, requireRole(['ADMIN']), validate(getReviewsQuerySchema), reviewController.getAllReviews);
router.get('/food/:foodId', reviewController.getFoodReviews);
router.use(authenticate);
router.get('/:reviewId', reviewController.getReviewById);
router.post('/', requireRole(['CUSTOMER']), validate(createReviewSchema), reviewController.createReview);
router.patch('/:reviewId', requireRole(['CUSTOMER']), validate(updateReviewSchema), reviewController.updateReview);
router.delete('/:reviewId', requireRole(['CUSTOMER', 'ADMIN']), reviewController.deleteReview);
router.post('/:reviewId/reply', requireRole([UserRole.PROVIDER, UserRole.ADMIN]), validate(replyReviewSchema), reviewController.replyToReview);

export default router;
