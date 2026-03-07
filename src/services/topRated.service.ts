import { Food } from '../models/food.model';
import { Review } from '../models/review.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { User } from '../models/user.model';
import { Types } from 'mongoose';

class TopRatedService {
    /**
     * Get Top Rated Restaurants (Sorted by review count and rating)
     * Shows ALL restaurants, sorted by total reviews first, then by rating
     */
    async getTopRestaurants(filters: any) {
        const { page = 1, limit = 20, minRating = 0 } = filters;
        const skip = (Number(page) - 1) * Number(limit);

        // Aggregate reviews by provider to calculate average rating
        const providerRatings = await Review.aggregate([
            {
                $group: {
                    _id: '$providerId',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $match: {
                    averageRating: { $gte: Number(minRating) }
                }
            },
            {
                // Sort by total reviews first (most reviews first), then by rating
                $sort: { totalReviews: -1, averageRating: -1 }
            }
        ]);

        // Get provider IDs
        const providerIds = providerRatings.map(p => p._id);

        // Get ALL active providers (not just those with reviews)
        const allProviderQuery: any = {
            isActive: true,
            status: 'ACTIVE',
            verificationStatus: 'APPROVED'
        };

        // If we have providers with reviews, prioritize them
        const [providersWithReviews, providersWithoutReviews, totalWithReviews, totalWithoutReviews] = await Promise.all([
            // Providers with reviews
            ProviderProfile.find({
                ...allProviderQuery,
                providerId: { $in: providerIds }
            })
                .populate('providerId', 'fullName email')
                .lean(),
            // Providers without reviews
            ProviderProfile.find({
                ...allProviderQuery,
                providerId: { $nin: providerIds }
            })
                .populate('providerId', 'fullName email')
                .lean(),
            ProviderProfile.countDocuments({
                ...allProviderQuery,
                providerId: { $in: providerIds }
            }),
            ProviderProfile.countDocuments({
                ...allProviderQuery,
                providerId: { $nin: providerIds }
            })
        ]);

        // Transform providers with reviews
        const transformedWithReviews = providersWithReviews.map((provider: any) => {
            const ratingData = providerRatings.find(
                r => r._id.toString() === provider.providerId?._id?.toString()
            );

            return {
                id: provider._id,
                providerId: provider.providerId?._id || provider.providerId,
                restaurantName: provider.restaurantName,
                profile: provider.profile,
                cuisine: provider.cuisine || [],
                city: provider.city,
                state: provider.state,
                address: provider.restaurantAddress,
                rating: ratingData?.averageRating || 0,
                totalReviews: ratingData?.totalReviews || 0,
                location: provider.location,
                isVerified: provider.isVerify,
                contactEmail: provider.contactEmail,
                phoneNumber: provider.phoneNumber
            };
        }).filter(r => r.providerId); // Remove any with null providerId

        // Transform providers without reviews
        const transformedWithoutReviews = providersWithoutReviews.map((provider: any) => ({
            id: provider._id,
            providerId: provider.providerId?._id || provider.providerId,
            restaurantName: provider.restaurantName,
            profile: provider.profile,
            cuisine: provider.cuisine || [],
            city: provider.city,
            state: provider.state,
            address: provider.restaurantAddress,
            rating: 0,
            totalReviews: 0,
            location: provider.location,
            isVerified: provider.isVerify,
            contactEmail: provider.contactEmail,
            phoneNumber: provider.phoneNumber
        })).filter(r => r.providerId); // Remove any with null providerId

        // Sort providers with reviews by total reviews (descending), then by rating
        transformedWithReviews.sort((a, b) => {
            if (b.totalReviews !== a.totalReviews) {
                return b.totalReviews - a.totalReviews; // Most reviews first
            }
            return b.rating - a.rating; // Then highest rating
        });

        // Combine: providers with reviews first, then without reviews
        const allRestaurants = [...transformedWithReviews, ...transformedWithoutReviews];

        // Apply pagination
        const paginatedRestaurants = allRestaurants.slice(skip, skip + Number(limit));

        return {
            restaurants: paginatedRestaurants,
            total: totalWithReviews + totalWithoutReviews,
            page: Number(page),
            limit: Number(limit)
        };
    }

    /**
     * Get Top Rated Foods (Rating >= 4.5)
     */
    async getTopFoods(filters: any) {
        const { page = 1, limit = 20, minRating = 4.5, providerId } = filters;
        const skip = (Number(page) - 1) * Number(limit);

        // Build match query for food reviews
        const matchQuery: any = {};
        if (providerId) {
            matchQuery.providerId = new Types.ObjectId(providerId);
        }

        // Aggregate reviews by food to calculate average rating
        const foodRatings = await Review.aggregate([
            {
                $match: {
                    foodId: { $exists: true, $ne: null },
                    ...matchQuery
                }
            },
            {
                $group: {
                    _id: '$foodId',
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 }
                }
            },
            {
                $match: {
                    averageRating: { $gte: Number(minRating) }
                }
            },
            {
                $sort: { averageRating: -1, totalReviews: -1 }
            }
        ]);

        // Get food IDs
        const foodIds = foodRatings.map(f => f._id);

        // Build food query
        const foodQuery: any = {
            _id: { $in: foodIds },
            foodStatus: true
        };

        if (providerId) {
            foodQuery.providerId = new Types.ObjectId(providerId);
        }

        // Get foods with pagination
        const [foods, total] = await Promise.all([
            Food.find(foodQuery)
                .populate('categoryId', 'categoryName')
                .populate('providerId', 'fullName')
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Food.countDocuments(foodQuery)
        ]);

        // Transform data
        const transformedFoods = foods.map((food: any) => {
            const ratingData = foodRatings.find(
                r => r._id.toString() === food._id.toString()
            );

            return {
                id: food._id,
                name: food.title,
                image: food.image,
                productDescription: food.productDescription || '',
                price: food.finalPriceTag,
                rating: ratingData?.averageRating || 0,
                totalReviews: ratingData?.totalReviews || 0,
                category: food.categoryId?.categoryName || 'Unknown',
                provider: food.providerId?.fullName || 'Unknown',
                providerID: food.providerId?._id || food.providerId,
                inStock: food.foodAvailability
            };
        });

        // Sort by rating
        transformedFoods.sort((a, b) => b.rating - a.rating);

        return {
            foods: transformedFoods,
            total,
            page: Number(page),
            limit: Number(limit)
        };
    }
}

export default new TopRatedService();
