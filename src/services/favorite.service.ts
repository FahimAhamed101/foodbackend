import { Favorite } from '../models/favorite.model';
import { Food } from '../models/food.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class FavoriteService {
    /**
     * @description Add a food item to favorites
     * @param userId User's ID
     * @param foodId Food Item ID
     */
    async addFavorite(userId: string, foodId: string) {
        // 1. Verify Food Exists and is Active
        const food = await Food.findOne({ _id: new Types.ObjectId(foodId), foodStatus: true });
        if (!food) {
            throw new AppError('Food item not found or unavailable', 404, 'FOOD_NOT_FOUND');
        }

        // 2. Create Favorite Record (Atomic handling via Unique Index)
        try {
            const favorite = await Favorite.create({
                userId: new Types.ObjectId(userId),
                foodId: new Types.ObjectId(foodId),
            });

            // 3. Atomically increment favoriteCount in Food
            await Food.updateOne(
                { _id: new Types.ObjectId(foodId) },
                { $inc: { favoriteCount: 1 } }
            );

            return favorite;
        } catch (error: any) {
            // Handle Duplicate Key Error (MongoDB Code 11000)
            if (error.code === 11000) {
                throw new AppError('Food already favorited', 400, 'ALREADY_FAVORITED');
            }
            throw error;
        }
    }

    /**
     * @description Remove a food item from favorites
     * @param userId User's ID
     * @param foodId Food Item ID
     */
    async removeFavorite(userId: string, foodId: string) {
        const deleted = await Favorite.findOneAndDelete({
            userId: new Types.ObjectId(userId),
            foodId: new Types.ObjectId(foodId),
        });

        if (!deleted) {
            throw new AppError('Favorite not found', 404, 'FAVORITE_NOT_FOUND');
        }

        // Atomically decrement favoriteCount, ensuring it doesn't go below 0
        await Food.updateOne(
            { _id: new Types.ObjectId(foodId), favoriteCount: { $gt: 0 } },
            { $inc: { favoriteCount: -1 } }
        );

        return { message: 'Removed from favorites' };
    }

    /**
     * @description Get Customer's Favorite Feed
     * @param userId User's ID
     * @param page Pagination page
     * @param limit Pagination limit
     */
    async getFavoriteFeed(userId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const pipeline = [
            // 1. Match User's Favorites
            { $match: { userId: new Types.ObjectId(userId) } },

            // 2. Sort by most recently favorited
            { $sort: { createdAt: -1 as const } }, // Fix TS inference if needed

            // 3. Pagination early to reduce lookup load
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: skip },
                        { $limit: limit },
                        // 4. Lookup Food Details
                        {
                            $lookup: {
                                from: 'foods',
                                localField: 'foodId',
                                foreignField: '_id',
                                as: 'food',
                            },
                        },
                        { $unwind: '$food' },
                        // 5. Filter only Active Foods (in case status changed)
                        { $match: { 'food.foodStatus': true } },
                        // 6. Project Minimal Fields
                        {
                            $project: {
                                _id: 0,
                                favoritedAt: '$createdAt',
                                food: {
                                    foodId: '$food._id',
                                    title: '$food.title',
                                    image: '$food.image',
                                    finalPriceTag: '$food.finalPriceTag',
                                    favoriteCount: '$food.favoriteCount',
                                    // rating will be handled if needed, for simplicity using basic fields
                                    // The requirements asked for "Minimal optimized food payload"
                                },
                            },
                        },
                    ],
                },
            },
        ];

        const result = await Favorite.aggregate(pipeline);
        const favorites = result[0].data;
        const total = result[0].metadata[0]?.total || 0;

        return {
            favorites,
            pagination: {
                total,
                page,
                limit,
            },
        };
    }

    /**
     * @description Get Stats for a specific food (Favorite Count & Rating)
     * @param foodId Food ID
     */
    async getFoodStats(foodId: string) {
        const stats = await Food.aggregate([
            { $match: { _id: new Types.ObjectId(foodId) } },
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    as: 'reviews',
                },
            },
            {
                $addFields: {
                    rating: { $ifNull: [{ $avg: '$reviews.rating' }, 0] },
                },
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    favoriteCount: 1,
                    rating: { $round: ['$rating', 1] },
                },
            },
        ]);

        if (!stats.length) {
            throw new AppError('Food not found', 404, 'FOOD_NOT_FOUND');
        }

        return stats[0];
    }
}

export default new FavoriteService();
