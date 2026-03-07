import { Response, Request } from 'express';
import { catchAsync } from '../utils/catchAsync';
import topRatedService from '../services/topRated.service';

class TopRatedController {
    /**
     * GET /api/v1/top-rated/restaurants
     * Get top rated restaurants (rating >= 4.5)
     */
    getTopRestaurants = catchAsync(async (req: Request, res: Response) => {
        const result = await topRatedService.getTopRestaurants(req.query);

        res.status(200).json({
            success: true,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit
            },
            data: result.restaurants
        });
    });

    /**
     * GET /api/v1/top-rated/foods
     * Get top rated foods (rating >= 4.5)
     */
    getTopFoods = catchAsync(async (req: Request, res: Response) => {
        const result = await topRatedService.getTopFoods(req.query);

        res.status(200).json({
            success: true,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit
            },
            data: result.foods
        });
    });
}

export default new TopRatedController();
