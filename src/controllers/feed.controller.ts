import { Response, Request } from 'express';
import { catchAsync } from '../utils/catchAsync';
import feedService from '../services/feed.service';
import { getRequestBaseUrl } from '../utils/mediaUrl';

class FeedController {
    getFeed = catchAsync(async (req: Request, res: Response) => {
        const result = await feedService.getFeed(req.query, getRequestBaseUrl(req));

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

    getHomeFeed = catchAsync(async (req: Request, res: Response) => {
        const result = await feedService.getHomeFeed(req.query, getRequestBaseUrl(req));

        res.status(200).json({
            success: true,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit
            },
            data: {
                categories: result.categories,
                dealOfDay: result.dealOfDay,
                sections: result.sections,
                foods: result.foods,
            }
        });
    });
}

export default new FeedController();
