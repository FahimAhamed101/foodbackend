import { Food } from '../models/food.model';
import { Category } from '../models/category.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Types } from 'mongoose';

class FeedService {
    private deriveSeed(value: string | undefined, fallback: number) {
        if (!value) return fallback;
        const source = value.toString().replace(/[^a-fA-F0-9]/g, '');
        if (!source) return fallback;
        const tail = source.slice(-6);
        const parsed = Number.parseInt(tail, 16);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    private enrichDiscoveryItem(item: any, index: number) {
        const seed = this.deriveSeed(item?.id?.toString(), index + 1);
        const etaMinutes = 10 + (seed % 26); // 10 - 35 mins
        const distanceKm = Number((0.6 + (seed % 40) / 10).toFixed(1)); // 0.6 - 4.5 km
        const reviewCount = 25 + (seed % 320);

        return {
            ...item,
            etaMinutes,
            distanceKm,
            reviewCount,
        };
    }

    async getFeed(filters: any) {
        const { categoryName, providerId, page = 1, limit = 20 } = filters;
        const query: any = { foodStatus: true, foodAvailability: true };

        // 1. Filter by Provider ID if provided
        if (providerId) {
            if (!Types.ObjectId.isValid(providerId)) {
                return { foods: [], total: 0, page: Number(page), limit: Number(limit) };
            }
            query.providerId = new Types.ObjectId(providerId);
        }

        // 2. Filter by Category Name if provided
        if (categoryName) {
            const categories = await Category.find({
                categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
            });

            if (categories.length > 0) {
                query.categoryId = { $in: categories.map(c => c._id) };
            } else {
                return { foods: [], total: 0, page: Number(page), limit: Number(limit) };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [foods, total] = await Promise.all([
            Food.find(query)
                .populate('categoryId', 'categoryName')
                .populate('providerId', 'fullName')
                .sort({ rating: -1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Food.countDocuments(query)
        ]);

        const providerIds = Array.from(
            new Set(
                foods
                    .map((food: any) => {
                        const provider = food?.providerId;
                        const rawProviderId = provider?._id || provider;
                        return rawProviderId ? String(rawProviderId) : '';
                    })
                    .filter(Boolean)
            )
        )
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));

        const providerProfiles = providerIds.length
            ? await ProviderProfile.find({ providerId: { $in: providerIds } })
                .select('providerId restaurantName restaurantAddress profile')
                .lean()
            : [];

        const providerProfileMap = new Map(
            providerProfiles.map((profile: any) => [String(profile.providerId), profile])
        );

        const transformedFoods = foods.map((food: any) => {
            const providerObjectId = food.providerId?._id || food.providerId;
            const providerIdString = String(providerObjectId || '');
            const providerProfile = providerProfileMap.get(providerIdString);
            const providerDisplayName =
                providerProfile?.restaurantName || food.providerId?.fullName || 'Unknown';

            return {
                id: String(food._id),
                _id: String(food._id),
                foodId: String(food._id),
                name: food.title,
                title: food.title,
                image: food.image,
                productDescription: food.productDescription || '',
                baseRevenue: food.baseRevenue,
                price: food.finalPriceTag,
                finalPriceTag: food.finalPriceTag,
                rating: food.rating || 0,
                category: food.categoryId?.categoryName || 'Unknown',
                categoryName: food.categoryId?.categoryName || 'Unknown',
                serviceFee: food.serviceFee || 0,
                provider: providerDisplayName,
                providerName: food.providerId?.fullName || providerDisplayName,
                providerRestaurantName: providerProfile?.restaurantName || '',
                restaurantName: providerProfile?.restaurantName || providerDisplayName,
                restaurantAddress: providerProfile?.restaurantAddress || '',
                providerProfile: providerProfile?.profile || '',
                profile: providerProfile?.profile || '',
                providerID: providerIdString,
                providerId: providerIdString,
                inStock: !!food.foodAvailability,
                foodStatus: !!food.foodStatus,
                foodAvailability: !!food.foodAvailability,
                createdAt: food.createdAt,
            };
        });

        return {
            foods: transformedFoods,
            total,
            page: Number(page),
            limit: Number(limit)
        };
    }

    async getHomeFeed(filters: any) {
        const requestedLimit = Number(filters?.limit || 20);
        const normalizedLimit = Number.isFinite(requestedLimit) ? Math.max(requestedLimit, 16) : 20;

        const feedResult = await this.getFeed({
            ...filters,
            page: Number(filters?.page || 1),
            limit: normalizedLimit,
        });

        const categoryDocs = await Category.find({ categoryStatus: true })
            .select('categoryName')
            .sort('categoryName')
            .limit(12)
            .lean();

        const categories = [
            'All',
            ...Array.from(
                new Set(
                    categoryDocs
                        .map((category: any) => (category?.categoryName || '').trim())
                        .filter(Boolean)
                )
            ),
        ];

        const discoveryFoods = feedResult.foods.map((food: any, index: number) =>
            this.enrichDiscoveryItem(food, index)
        );

        const startTheDay = discoveryFoods.slice(0, 8);
        const lateNightCravingsSource = discoveryFoods.slice(8, 16);
        const lateNightCravings = lateNightCravingsSource.length > 0
            ? lateNightCravingsSource
            : discoveryFoods.slice(0, 8);

        const featured = discoveryFoods[0] || null;

        return {
            categories,
            dealOfDay: featured ? {
                title: `35% OFF on ${featured.category || 'Best Picks'}!`,
                subtitle: `Fresh ${featured.name} waiting for you`,
                ctaText: 'Buy now',
                image: featured.image,
            } : null,
            sections: {
                startTheDay,
                lateNightCravings,
            },
            foods: discoveryFoods,
            total: feedResult.total,
            page: feedResult.page,
            limit: feedResult.limit,
        };
    }

    async getDiscoveryMetadata() {
        const categories = await Category.find().distinct('categoryName');
        return {
            featuredCategories: categories
        };
    }
}

export default new FeedService();
