import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import favoriteService from '../services/favorite.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

class FavoriteController {
    /**
     * POST /favorites
     */
    addFavorite = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const { foodId } = req.body;

        const result = await favoriteService.addFavorite(userId, foodId);

        res.status(201).json({
            success: true,
            data: result,
        });
    });

    /**
     * DELETE /favorites/:foodId
     */
    removeFavorite = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const foodId = req.params.foodId as string;

        const result = await favoriteService.removeFavorite(userId, foodId);

        res.status(200).json({
            success: true,
            data: result,
        });
    });

    /**
     * GET /favorites/feed
     */
    getFavoriteFeed = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await favoriteService.getFavoriteFeed(userId, page, limit);

        res.status(200).json({
            success: true,
            data: result,
        });
    });

    /**
     * GET /foods/:foodId/stats
     * Note: This might be routed from /foods route or /favorites route depending on design.
     * Implementation here for completeness.
     */
    getFoodStats = catchAsync(async (req: AuthRequest, res: Response) => {
        const foodId = req.params.foodId as string;

        // This endpoint is for Providers, but could be public. 
        // Prompt says "Providers can: See how many users favorited a food".

        const stats = await favoriteService.getFoodStats(foodId);

        res.status(200).json({
            success: true,
            data: stats,
        });
    });
}

export default new FavoriteController();
