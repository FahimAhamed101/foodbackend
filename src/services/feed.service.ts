import { Food } from '../models/food.model';
import { Category } from '../models/category.model';
import { Types } from 'mongoose';

class FeedService {
    async getFeed(filters: any) {
        const { categoryName, providerId, page = 1, limit = 20 } = filters;
        const query: any = { foodStatus: true };

        // 1. Filter by Provider ID if provided
        if (providerId) {
            query.providerId = new Types.ObjectId(providerId);
        }

        // 2. Filter by Category Name if provided
        if (categoryName) {
            // Find all categories with this name (could be multiple providers with same cat name)
            const categories = await Category.find({
                categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') }
            });

            if (categories.length > 0) {
                query.categoryId = { $in: categories.map(c => c._id) };
            } else {
                // If category doesn't exist, return empty
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

        // Transform data for feed display
        const transformedFoods = foods.map((food: any) => ({
            id: food._id,
            name: food.title,
            image: food.image,
            productDescription: food.productDescription || '', // Updated to use the new field name
            baseRevenue: food.baseRevenue,
            price: food.finalPriceTag,
            rating: food.rating || 0,
            category: food.categoryId?.categoryName || 'Unknown',
            serviceFee: food.serviceFee || 0,
            provider: food.providerId?.fullName || 'Unknown',
            providerID: food.providerId?._id || food.providerId,
            inStock: food.foodAvailability
        }));

        return {
            foods: transformedFoods,
            total,
            page: Number(page),
            limit: Number(limit)
        };
    }

    async getDiscoveryMetadata() {
        // Optional: Return categories to display at the top of the feed
        const categories = await Category.find().distinct('categoryName');
        return {
            featuredCategories: categories
        };
    }
}

export default new FeedService();
