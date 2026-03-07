import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import reviewService from '../services/review.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

class ReviewController {
    createReview = catchAsync(async (req: AuthRequest, res: Response) => {
        const customerId = req.user!.userId;
        const review = await reviewService.createReview(customerId, req.body);
        res.status(201).json({ success: true, message: 'Review submitted', data: review });
    });

    getReviewById = catchAsync(async (req: AuthRequest, res: Response) => {
        const { reviewId } = req.params;
        const review = await reviewService.getReviewById(reviewId as string);
        res.status(200).json({ success: true, data: review });
    });

    updateReview = catchAsync(async (req: AuthRequest, res: Response) => {
        const { reviewId } = req.params;
        const customerId = req.user!.userId;
        const review = await reviewService.updateReview(reviewId as string, customerId, req.body);
        res.status(200).json({ success: true, message: 'Review updated', data: review });
    });

    deleteReview = catchAsync(async (req: AuthRequest, res: Response) => {
        const { reviewId } = req.params;
        const customerId = req.user!.userId;
        await reviewService.deleteReview(reviewId as string, customerId);
        res.status(200).json({ success: true, message: 'Review deleted' });
    });

    replyToReview = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const role = req.user!.role;
        const { reviewId } = req.params;
        const { comment } = req.body;
        const review = await reviewService.replyToReview(userId, role, reviewId as string, comment);
        res.status(200).json({ success: true, message: 'Reply added', data: review });
    });

    getRatingStats = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.params.providerId || req.user?.userId;

        if (!providerId) {
            throw new AppError('Provider ID is required', 400, 'PROVIDER_ID_REQUIRED');
        }

        const stats = await reviewService.getRatingDistribution(providerId as string);
        res.status(200).json({ success: true, data: stats });
    });

    getProviderReviews = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.params.providerId || req.user?.userId;

        if (!providerId) {
            throw new AppError('Provider ID is required', 400, 'PROVIDER_ID_REQUIRED');
        }

        const data = await reviewService.searchAndFilterReviews(providerId as string, req.query);
        res.status(200).json({ success: true, data: data.reviews, pagination: data.pagination });
    });

    getFoodReviews = catchAsync(async (req: Request | AuthRequest, res: Response) => {
        const { foodId } = req.params;
        const result = await reviewService.getFoodReviews(foodId as string);
        res.status(200).json({
            success: true,
            totalReviews: result.totalReviews,
            data: result.reviews
        });
    });

    getAllReviews = catchAsync(async (req: AuthRequest, res: Response) => {
        const data = await reviewService.searchAndFilterReviews(null, req.query);
        res.status(200).json({ success: true, data: data.reviews, pagination: data.pagination });
    });
}

export default new ReviewController();


