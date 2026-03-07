import { Review } from '../models/review.model';
import { Order, OrderStatus } from '../models/order.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

class ReviewService {

    async createReview(customerId: string, data: { orderId: string; rating: number; comment: string; foodId?: string }) {
        console.log(`📝 [ReviewService] Creating review for Order: ${data.orderId}, Customer: ${customerId}`);

        const order = await Order.findOne({
            $or: [
                { orderId: data.orderId },
                { _id: Types.ObjectId.isValid(data.orderId) ? new Types.ObjectId(data.orderId) : undefined }
            ].filter(q => q._id !== undefined || q.orderId)
        });

        if (!order) {
            console.error(`❌ [ReviewService] Order not found: ${data.orderId}`);
            throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
        }

        console.log(`📦 [ReviewService] Order status: ${order.status}, Items count: ${order.items?.length}`);

        if (order.status !== OrderStatus.COMPLETED) {
            console.warn(`⚠️ [ReviewService] Order not completed. Status: ${order.status}`);
            throw new AppError('You can only review completed orders', 400, 'ORDER_NOT_COMPLETED');
        }

        if (order.customerId.toString() !== customerId) {
            throw new AppError('You are not authorized to review this order', 403, 'FORBIDDEN');
        }

        // Auto-Link Logic: If foodId is missing but order has only one item, link it automatically
        let targetFoodId = data.foodId;
        if ((!targetFoodId || targetFoodId === "") && order.items && order.items.length === 1) {
            targetFoodId = order.items[0].foodId.toString();
            console.log(`🔗 [ReviewService] Auto-linking review to foodId: ${targetFoodId}`);
        } else {
            console.log(`ℹ️ [ReviewService] foodId provided or multiple items. TargetFoodId: ${targetFoodId}`);
        }

        // If foodId is provided (or auto-assigned), verify it belongs to this order
        if (targetFoodId && targetFoodId !== "") {
            const foodInOrder = order.items.find(item => item.foodId.toString() === targetFoodId);
            if (!foodInOrder) {
                console.error(`❌ [ReviewService] FoodId ${targetFoodId} not in order`);
                throw new AppError('Food item not found in this order', 400, 'FOOD_NOT_IN_ORDER');
            }
        }

        const review = await Review.create({
            providerId: order.providerId,
            customerId: order.customerId,
            orderId: order._id,
            foodId: (targetFoodId && Types.ObjectId.isValid(targetFoodId))
                ? new Types.ObjectId(targetFoodId)
                : (order.items && order.items.length === 1 ? order.items[0].foodId : undefined),
            rating: data.rating,
            comment: data.comment,
        });

        console.log(`✅ [ReviewService] Review created: ${review._id}, foodId: ${review.foodId || 'NONE'}`);

        // Convert to plain object and ensure foodId is present (even if empty) to return as spec
        const reviewObj = review.toObject();
        return {
            ...reviewObj,
            foodId: reviewObj.foodId ? reviewObj.foodId.toString() : ""
        };
    }

    async getFoodReviews(foodId: string) {
        if (!Types.ObjectId.isValid(foodId)) {
            throw new AppError('Invalid Food ID', 400, 'INVALID_FOOD_ID');
        }

        const foodObjectId = new Types.ObjectId(foodId);

        // Fetch aggregation for statistics and the reviews list in parallel
        const [stats, reviews] = await Promise.all([
            Review.aggregate([
                { $match: { foodId: foodObjectId } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 },
                        distribution: {
                            $push: '$rating'
                        }
                    }
                }
            ]),
            Review.find({ foodId: foodObjectId })
                .populate('customerId', 'fullName profilePic')
                .sort({ createdAt: -1 })
        ]);

        // Process distribution
        const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let averageRating = 0;
        let totalReviews = 0;

        if (stats.length > 0) {
            averageRating = Math.round(stats[0].averageRating * 10) / 10;
            totalReviews = stats[0].totalReviews;
            stats[0].distribution.forEach((r: number) => {
                const star = r as keyof typeof ratingDistribution;
                if (ratingDistribution[star] !== undefined) {
                    ratingDistribution[star]++;
                }
            });
        }

        return {
            totalReviews,
            averageRating,
            ratingDistribution,
            reviews: reviews.map(rev => ({
                id: rev._id,
                name: (rev.customerId as any)?.fullName || 'Anonymous',
                profileImage: (rev.customerId as any)?.profilePic || '',
                rating: rev.rating,
                description: rev.comment,
                date: rev.createdAt
            }))
        };
    }

    async getReviewById(reviewId: string) {
        if (!Types.ObjectId.isValid(reviewId)) throw new AppError('Invalid Review ID', 400, 'INVALID_ID');

        const review = await Review.findById(reviewId)
            .populate('customerId', 'fullName profilePicture')
            .populate('providerId', 'fullName');

        if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
        return review;
    }

    async updateReview(reviewId: string, customerId: string, data: { rating?: number; comment?: string }) {
        const review = await Review.findOne({ _id: reviewId, customerId: new Types.ObjectId(customerId) });
        if (!review) throw new AppError('Review not found or not authorized', 404, 'NOT_FOUND');

        if (data.rating) review.rating = data.rating;
        if (data.comment) review.comment = data.comment;

        await review.save();
        return review;
    }

    async deleteReview(reviewId: string, customerId: string) {
        const result = await Review.findOneAndDelete({ _id: reviewId, customerId: new Types.ObjectId(customerId) });
        if (!result) throw new AppError('Review not found or not authorized', 404, 'NOT_FOUND');
        return true;
    }

    async replyToReview(userId: string, role: string, reviewId: string, comment: string) {
        let review;

        if (role === 'ADMIN') {
            review = await Review.findById(reviewId);
        } else {
            review = await Review.findOne({ _id: reviewId, providerId: new Types.ObjectId(userId) });
        }

        if (!review) throw new AppError('Review not found or you are not authorized to reply', 404, 'NOT_AUTHORIZED');

        review.reply = {
            comment,
            createdAt: new Date(),
        };

        await review.save();
        return review;
    }

    async getRatingDistribution(providerId: string) {
        const stats = await Review.aggregate([
            { $match: { providerId: new Types.ObjectId(providerId) } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        const distribution = [5, 4, 3, 2, 1].map(star => {
            const found = stats.find(s => s._id === star);
            return { rating: star, count: found ? found.count : 0 };
        });

        const totalReviews = distribution.reduce((acc, curr) => acc + curr.count, 0);
        const averageRating = totalReviews > 0
            ? (distribution.reduce((acc, curr) => acc + (curr.rating * curr.count), 0) / totalReviews).toFixed(1)
            : 0;

        return { totalReviews, averageRating, distribution };
    }

    async searchAndFilterReviews(providerId: string | null, filters: any) {
        const { rating, customerName, page = 1, limit = 10 } = filters;
        const skip = (Number(page) - 1) * Number(limit);

        const pipeline: any[] = [];

        if (providerId) {
            pipeline.push({ $match: { providerId: new Types.ObjectId(providerId) } });
        }

        if (rating && rating !== 'all') {
            pipeline.push({ $match: { rating: Number(rating) } });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'users',
                    localField: 'customerId',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' }
        );

        if (customerName) {
            pipeline.push({
                $match: {
                    'customer.fullName': { $regex: customerName, $options: 'i' }
                }
            });
        }

        pipeline.push({ $sort: { createdAt: -1 } });

        const result = await Review.aggregate([
            ...pipeline,
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $skip: skip },
                        { $limit: Number(limit) },
                        {
                            $project: {
                                _id: 1,
                                rating: 1,
                                comment: 1,
                                reply: 1,
                                createdAt: 1,
                                customerName: '$customer.fullName',
                                customerProfile: '$customer.profilePic'
                            }
                        }
                    ],
                },
            },
        ]);

        const total = result[0].metadata[0]?.total || 0;
        const reviews = result[0].data;

        return {
            reviews,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }
    /**
     * Drops old/obsolete indexes that cause E11000 errors
     */
    async cleanupObsoleteIndexes() {
        try {
            const collection = Review.collection;
            const indexes = await collection.indexes();
            const hasGhostIndex = indexes.some(idx => idx.name === 'orderId_1_reviewerId_1');

            if (hasGhostIndex) {
                console.log('🧹 [ReviewService] Dropping obsolete ghost index: orderId_1_reviewerId_1');
                await collection.dropIndex('orderId_1_reviewerId_1');
                console.log('✅ [ReviewService] Ghost index dropped successfully.');
            }
        } catch (err) {
            console.error('❌ [ReviewService] Error cleaning up indexes:', err);
        }
    }
}

export default new ReviewService();
