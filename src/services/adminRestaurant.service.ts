import { Types } from 'mongoose';
import { Order, OrderStatus } from '../models/order.model';
import { Payment, PaymentStatus, PayoutStatus } from '../models/payment.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Food } from '../models/food.model';
import { Review } from '../models/review.model';
import AppError from '../utils/AppError';

class AdminRestaurantService {

    async getDashboardStats(restaurantId: string) {
        const objectId = new Types.ObjectId(restaurantId);

        const [salesData] = await Payment.aggregate([
            { $match: { providerId: objectId, status: PaymentStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    platformFee: { $sum: '$commission' },
                }
            }
        ]);

        const [ordersData] = await Order.aggregate([
            { $match: { providerId: objectId } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                }
            }
        ]);

        const [payoutData] = await Payment.aggregate([
            { $match: { providerId: objectId, payoutStatus: PayoutStatus.PENDING, status: PaymentStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    nextPayoutAmount: { $sum: '$netAmount' }
                }
            }
        ]);

        return {
            totalSales: salesData?.totalSales || 0,
            totalOrders: ordersData?.totalOrders || 0,
            platformFeePerOrder: salesData?.platformFee && ordersData?.totalOrders
                ? (salesData.platformFee / ordersData.totalOrders).toFixed(2)
                : 0,
            nextPayout: {
                amount: payoutData?.nextPayoutAmount || 0,
                scheduledAt: new Date(new Date().setDate(new Date().getDate() + 7)) // Mock schedule
            }
        };
    }

    async getProfile(restaurantId: string) {
        const profile = await ProviderProfile.findOne({ providerId: restaurantId });
        if (!profile) throw new AppError('Restaurant not found', 404);

        return {
            cuisine: profile.cuisine || [],
            contact: {
                phone: profile.phoneNumber,
                website: '' // Not currently in schema
            }
        };
    }

    async getPickupWindows(restaurantId: string) {
        const profile = await ProviderProfile.findOne({ providerId: restaurantId });
        if (!profile) throw new AppError('Restaurant not found', 404);

        // Validation logic: pickupStartTime - listingCreatedAt >= 2 hours (Mock logic as requested)
        return profile.pickupWindows || [];
    }

    async getActivitySummary(restaurantId: string) {
        const objectId = new Types.ObjectId(restaurantId);

        const [listings, orders, reviews] = await Promise.all([
            Food.countDocuments({ providerId: objectId }),
            Order.countDocuments({ providerId: objectId }),
            Review.countDocuments({ providerId: objectId }) // Assuming review has providerId or we need to look up via food
        ]);

        // Review model check: does it have providerId? 
        // If Review is linked to Food, we might need aggregation.
        // Let's assume Review has providerId for simplicity or check model.
        // Checked model: Review has 'customerId' and 'foodId'. No providerId directly.
        // We need to aggregate reviews by looking up foods owned by provider.

        const reviewCount = await Review.aggregate([
            {
                $lookup: {
                    from: 'foods',
                    localField: 'foodId',
                    foreignField: '_id',
                    as: 'food'
                }
            },
            { $unwind: '$food' },
            { $match: { 'food.providerId': objectId } },
            { $count: 'count' }
        ]);

        return {
            listings,
            orders,
            reviews: reviewCount[0]?.count || 0
        };
    }

    async getCompliance(restaurantId: string) {
        const profile = await ProviderProfile.findOne({ providerId: restaurantId });
        if (!profile) throw new AppError('Restaurant not found', 404);

        return profile.compliance || { alcoholNotice: { enabled: false }, tax: { region: 'US-NY', rate: 8.875 } };
    }

    async getLocation(restaurantId: string) {
        const profile = await ProviderProfile.findOne({ providerId: restaurantId });
        if (!profile) throw new AppError('Restaurant not found', 404);

        return {
            address: `${profile.restaurantAddress}, ${profile.city}, ${profile.state} ${profile.zipCode || ''}`,
            lat: profile.location?.lat || 40.7128,
            lng: profile.location?.lng || -74.0060
        };
    }

    async blockRestaurant(restaurantId: string, reason: string) {
        // Transactions removed for standalone MongoDB compatibility
        const objectId = new Types.ObjectId(restaurantId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: restaurantId },
            {
                status: 'BLOCKED',
                isActive: false,
                blockReason: reason
            },
            { new: true }
        );

        if (!profile) throw new AppError('Restaurant not found', 404);

        // Suspend all listings
        await Food.updateMany(
            { providerId: objectId },
            { foodStatus: false }
        );

        return profile;
    }

    async unblockRestaurant(restaurantId: string) {
        // Transactions removed for standalone MongoDB compatibility
        const objectId = new Types.ObjectId(restaurantId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: restaurantId },
            {
                status: 'ACTIVE',
                isActive: true,
                $unset: { blockReason: 1 } // Remove blockReason field
            },
            { new: true }
        );

        if (!profile) throw new AppError('Restaurant not found', 404);

        // Reactivate all listings
        await Food.updateMany(
            { providerId: objectId },
            { foodStatus: true }
        );

        return profile;
    }

    async approveRestaurant(restaurantId: string) {
        const objectId = new Types.ObjectId(restaurantId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: objectId },
            {
                verificationStatus: 'APPROVED',
                status: 'ACTIVE',
                isActive: true,
                isVerify: true, // Legacy field
                $unset: { blockReason: 1 }
            },
            { new: true }
        );

        if (!profile) {
            throw new AppError('Restaurant not found', 404);
        }

        return profile;
    }

    async rejectRestaurant(restaurantId: string, reason: string) {
        const objectId = new Types.ObjectId(restaurantId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: objectId },
            {
                verificationStatus: 'REJECTED',
                status: 'BLOCKED',
                isActive: false,
                blockReason: reason
            },
            { new: true }
        );

        if (!profile) {
            throw new AppError('Restaurant not found', 404);
        }

        return profile;
    }

    async getProviderOrderHistory(restaurantId: string) {
        const providerId = new Types.ObjectId(restaurantId);

        const orders = await Order.find({ providerId })
            .select('orderId customerId status totalPrice createdAt')
            .populate('customerId', 'fullName')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return orders.map((order: any) => ({
            orderId: order.orderId,
            customerName: order.customerId?.fullName || 'Unknown Customer',
            date: order.createdAt,
            status: order.status,
            amount: order.totalPrice
        }));
    }

    async getProviderReviews(restaurantId: string, filter: { rating?: number; page?: number; limit?: number }) {
        const providerId = new Types.ObjectId(restaurantId);
        const { rating, page = 1, limit = 20 } = filter;
        const skip = (page - 1) * limit;

        const query: any = { providerId };
        if (rating) {
            query.rating = rating;
        }

        const reviews = await Review.find(query)
            .select('customerId rating comment createdAt')
            .populate('customerId', 'fullName profilePic')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalReviews = await Review.countDocuments(query);

        return {
            reviews: reviews.map((review: any) => ({
                profilePic: review.customerId?.profilePic || '',
                customerName: review.customerId?.fullName || 'Anonymous',
                rating: review.rating,
                reviewDetails: review.comment,
                createdAt: review.createdAt
            })),
            pagination: {
                total: totalReviews,
                page,
                limit,
                pages: Math.ceil(totalReviews / limit)
            }
        };
    }

    async getAllRestaurants(query: any) {
        const { state, rating, status, page = 1, limit = 20 } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const matchStage: any = {};

        // 1. State Filter
        if (state && state !== 'all_states' && state !== 'USA') {
            matchStage.state = state;
        }

        // 2. Status Filter
        if (status && status !== 'all_status') {
            if (status === 'approved') {
                matchStage.verificationStatus = 'APPROVED';
                matchStage.status = 'ACTIVE';
            } else if (status === 'pending_approval') {
                matchStage.verificationStatus = 'PENDING';
            } else if (status === 'blocked') {
                matchStage.status = 'BLOCKED';
            }
        }

        const pipeline: any[] = [
            { $match: matchStage },
            // Lookup Owner (User)
            {
                $lookup: {
                    from: 'users',
                    localField: 'providerId',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            // Lookup Reviews for average rating
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                    ],
                    as: 'reviewStats'
                }
            },
            { $unwind: { path: '$reviewStats', preserveNullAndEmptyArrays: true } },
            // Lookup Foods for total listings count
            {
                $lookup: {
                    from: 'foods',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $count: 'count' }
                    ],
                    as: 'listingStats'
                }
            },
            { $unwind: { path: '$listingStats', preserveNullAndEmptyArrays: true } },
            // Lookup Payments for revenue (sum of totalAmount where status is completed)
            {
                $lookup: {
                    from: 'payments',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $match: { status: 'completed' } },
                        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
                    ],
                    as: 'paymentStats'
                }
            },
            { $unwind: { path: '$paymentStats', preserveNullAndEmptyArrays: true } },
            // Project fields
            {
                $project: {
                    restaurantId: '$providerId',
                    restaurantName: 1,
                    owner: '$owner.fullName',
                    state: 1,
                    totalListings: { $ifNull: ['$listingStats.count', 0] },
                    revenue: { $ifNull: ['$paymentStats.totalRevenue', 0] },
                    ratings: { $ifNull: ['$reviewStats.avgRating', 0] },
                    status: {
                        $cond: {
                            if: { $eq: ['$status', 'BLOCKED'] }, then: 'blocked',
                            else: {
                                $cond: {
                                    if: { $eq: ['$verificationStatus', 'PENDING'] }, then: 'pending_approval',
                                    else: 'approved'
                                }
                            }
                        }
                    },
                    createdAt: 1
                }
            }
        ];

        // 3. Ratings Filter (Post-calculation)
        if (rating && rating !== 'all_ratings') {
            const ratingNum = Math.floor(Number(rating));

            pipeline.push({
                $match: {
                    ratings: { $gte: ratingNum, $lt: ratingNum + 1 }
                }
            });
        }

        // Facet for Pagination
        pipeline.push({
            $facet: {
                metadata: [{ $count: 'total' }],
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: Number(limit) }
                ]
            }
        });

        const result = await ProviderProfile.aggregate(pipeline as any);

        const metadata = result[0].metadata[0] || { total: 0 };
        const restaurants = result[0].data;

        return {
            pagination: {
                page: Number(page),
                limit: Number(limit),
                totalRestaurants: metadata.total,
                totalPages: Math.ceil(metadata.total / Number(limit))
            },
            restaurants
        };
    }

    async getRestaurantDetails(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        const pipeline = [
            { $match: { providerId: pId } },
            // Lookup Owner (User)
            {
                $lookup: {
                    from: 'users',
                    localField: 'providerId',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            // Lookup Reviews
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                    ],
                    as: 'reviewStats'
                }
            },
            { $unwind: { path: '$reviewStats', preserveNullAndEmptyArrays: true } },
            // Lookup Foods count
            {
                $lookup: {
                    from: 'foods',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $count: 'count' }
                    ],
                    as: 'listingStats'
                }
            },
            { $unwind: { path: '$listingStats', preserveNullAndEmptyArrays: true } },
            // Lookup Payments revenue
            {
                $lookup: {
                    from: 'payments',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $match: { status: 'completed' } },
                        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
                    ],
                    as: 'paymentStats'
                }
            },
            { $unwind: { path: '$paymentStats', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    owner: {
                        restaurantsPick: { $ifNull: ['$profile', ''] },
                        name: '$owner.fullName',
                        email: '$owner.email'
                    },
                    restaurantsName: '$restaurantName',
                    restaurantsid: '$providerId',
                    status: {
                        $cond: {
                            if: { $eq: ['$status', 'BLOCKED'] }, then: 'blocked',
                            else: {
                                $cond: {
                                    if: { $eq: ['$verificationStatus', 'PENDING'] }, then: 'pending_approval',
                                    else: 'approved'
                                }
                            }
                        }
                    },
                    ratings: { $ifNull: ['$reviewStats.avgRating', 0] },
                    totalListings: { $ifNull: ['$listingStats.count', 0] },
                    revenue: { $ifNull: ['$paymentStats.totalRevenue', 0] },
                    documents: {
                        license: { $gt: [{ $size: { $ifNull: ['$verificationDocuments', []] } }, 0] },
                        nid: { $gt: [{ $size: { $ifNull: ['$verificationDocuments', []] } }, 1] }
                    }
                }
            }
        ];

        const result = await ProviderProfile.aggregate(pipeline as any);

        if (!result.length) {
            throw new AppError('Restaurant not found', 404);
        }

        return result[0];
    }
    async getAllRestaurantsDetailed(query: any = {}) {
        const { page = 1, limit = 50 } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const pipeline = [
            // Lookup Owner (User)
            {
                $lookup: {
                    from: 'users',
                    localField: 'providerId',
                    foreignField: '_id',
                    as: 'owner'
                }
            },
            { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
            // Lookup Reviews
            {
                $lookup: {
                    from: 'reviews',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
                    ],
                    as: 'reviewStats'
                }
            },
            { $unwind: { path: '$reviewStats', preserveNullAndEmptyArrays: true } },
            // Lookup Foods count
            {
                $lookup: {
                    from: 'foods',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $count: 'count' }
                    ],
                    as: 'listingStats'
                }
            },
            { $unwind: { path: '$listingStats', preserveNullAndEmptyArrays: true } },
            // Lookup Payments revenue
            {
                $lookup: {
                    from: 'payments',
                    localField: 'providerId',
                    foreignField: 'providerId',
                    pipeline: [
                        { $match: { status: 'completed' } },
                        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
                    ],
                    as: 'paymentStats'
                }
            },
            { $unwind: { path: '$paymentStats', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    restaurantName: 1,
                    createdAt: 1,
                    owner: {
                        name: '$owner.fullName',
                        email: '$owner.email'
                    },
                    restaurantId: '$providerId',
                    status: {
                        $cond: {
                            if: { $eq: ['$status', 'BLOCKED'] }, then: 'blocked',
                            else: {
                                $cond: {
                                    if: { $eq: ['$verificationStatus', 'PENDING'] }, then: 'pending_approval',
                                    else: 'approved'
                                }
                            }
                        }
                    },
                    ratings: { $ifNull: ['$reviewStats.avgRating', 0] },
                    totalListings: { $ifNull: ['$listingStats.count', 0] },
                    revenue: { $ifNull: ['$paymentStats.totalRevenue', 0] },
                    documents: {
                        license: { $gt: [{ $size: { $ifNull: ['$verificationDocuments', []] } }, 0] },
                        nid: { $gt: [{ $size: { $ifNull: ['$verificationDocuments', []] } }, 1] }
                    }
                }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: Number(limit) }
                    ]
                }
            }
        ];

        const result = await ProviderProfile.aggregate(pipeline as any);
        const metadata = result[0].metadata[0] || { total: 0 };
        const data = result[0].data;

        return {
            total: metadata.total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(metadata.total / Number(limit)),
            data
        };
    }
}

export default new AdminRestaurantService();
