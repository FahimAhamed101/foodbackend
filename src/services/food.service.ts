import { Food } from '../models/food.model';
import { Category } from '../models/category.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';
import activityLogService from './activityLog.service';
import { AuditEventType } from '../models/auditLog.model';
import complianceService from './compliance.service';

class FoodService {

    private async verifyCategoryOwnership(categoryId: string, providerId: string) {
        const category = await Category.findOne({
            _id: new Types.ObjectId(categoryId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!category) {
            throw new AppError('Category not found or does not belong to you', 403, 'CATEGORY_OWNERSHIP_ERROR');
        }
        return category;
    }

    async createFood(providerId: string, foodData: any) {
            const { categoryId, title, baseRevenue, serviceFee, productDescription, image } = foodData;

            // Validate image is provided (either URL or uploaded file)
            if (!image) {
                throw new AppError('Image is required. Provide image URL in JSON or upload file via form-data', 400, 'IMAGE_REQUIRED');
            }

            await this.verifyCategoryOwnership(categoryId, providerId);

            const existingFood = await Food.findOne({
                categoryId: new Types.ObjectId(categoryId),
                title: { $regex: new RegExp(`^${title}$`, 'i') },
            });

            if (existingFood) {
                throw new AppError('Food item with this title already exists in this category', 400, 'DUPLICATE_FOOD_ERROR');
            }

            const finalPriceTag = Number(baseRevenue) + Number(serviceFee);

            const food = await Food.create({
                ...foodData,
                providerId: new Types.ObjectId(providerId),
                categoryId: new Types.ObjectId(categoryId),
                finalPriceTag,
            });

            // 🔥 Compliance Scan for Alcohol Keywords
            await complianceService.scanFoodItem(
                food._id as Types.ObjectId,
                new Types.ObjectId(providerId),
                title,
                productDescription
            );

            // Log the activity
            await activityLogService.logActivity({
                userId: providerId,
                eventType: AuditEventType.MENU_ITEM_CREATED,
                action: `Added new menu item: ${food.title}`,
                resource: 'Food',
                metadata: {
                    foodId: food._id,
                    providerId: providerId,
                    categoryId: food.categoryId
                }
            });

            return food;
        }


    async getProviderFoods(providerId: string, filters: any) {
        const { categoryName, status, page = 1, limit = 10 } = filters;
        const query: any = { providerId: new Types.ObjectId(providerId) };

        if (categoryName) {
            const escapedName = categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const category = await Category.findOne({
                providerId: new Types.ObjectId(providerId),
                categoryName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            });

            if (!category) {
                throw new AppError(`Category '${categoryName}' not found`, 404, 'CATEGORY_NOT_FOUND_ERROR');
            }
            query.categoryId = category._id;
        }

        if (status === 'active') {
            query.foodStatus = true;
        } else if (status === 'inactive') {
            query.foodStatus = false;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [foods, total] = await Promise.all([
            Food.find(query)
                .populate('categoryId', 'categoryName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Food.countDocuments(query),
        ]);

        const transformedFoods = foods.map((food: any) => ({
            foodId: food._id,
            title: food.title,
            categoryName: food.categoryId?.categoryName || 'Unknown',
            image: food.image,
            finalPriceTag: food.finalPriceTag,
            foodAvailability: food.foodAvailability,
            foodStatus: food.foodStatus,
            createdAt: food.createdAt,
        }));

        return {
            foods: transformedFoods,
            meta: {
                page: Number(page),
                limit: Number(limit),
                total,
            },
        };
    }

    async getFoodsByCategory(categoryId: string, providerId: string) {
        await this.verifyCategoryOwnership(categoryId, providerId);

        return await Food.find({
            categoryId: new Types.ObjectId(categoryId),
            providerId: new Types.ObjectId(providerId),
        }).sort('-createdAt');
    }

    async getFoodById(foodId: string, providerId: string) {
        const food = await Food.findOne({
            _id: new Types.ObjectId(foodId),
            providerId: new Types.ObjectId(providerId),
        }).populate('categoryId', 'categoryName');

        if (!food) {
            throw new AppError('Food item not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        return food;
    }

    async updateFood(foodId: string, providerId: string, updateData: any) {
        const food = await Food.findOne({
            _id: new Types.ObjectId(foodId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!food) {
            throw new AppError('Food item not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        if (updateData.categoryId && updateData.categoryId.toString() !== food.categoryId.toString()) {
            await this.verifyCategoryOwnership(updateData.categoryId, providerId);
        }

        if (updateData.baseRevenue !== undefined || updateData.serviceFee !== undefined) {
            const br = updateData.baseRevenue !== undefined ? updateData.baseRevenue : food.baseRevenue;
            const sf = updateData.serviceFee !== undefined ? updateData.serviceFee : food.serviceFee;
            updateData.finalPriceTag = Number(br) + Number(sf);
        }

        if (updateData.title && updateData.title !== food.title) {
            const catId = updateData.categoryId || food.categoryId;
            const existing = await Food.findOne({
                categoryId: new Types.ObjectId(catId),
                title: { $regex: new RegExp(`^${updateData.title}$`, 'i') },
                _id: { $ne: food._id },
            });

            if (existing) {
                throw new AppError('Another food item with this title already exists in this category', 400, 'DUPLICATE_FOOD_ERROR');
            }
        }

        Object.assign(food, updateData);
        await food.save();

        // 🔥 Re-scan Compliance if text changed
        if (updateData.title || updateData.productDescription) {
            await complianceService.scanFoodItem(
                food._id as Types.ObjectId,
                new Types.ObjectId(providerId),
                food.title,
                food.productDescription || ''
            );
        }

        return food;
    }

    async deleteFood(foodId: string, providerId: string) {
        const food = await Food.findOneAndDelete({
            _id: new Types.ObjectId(foodId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!food) {
            throw new AppError('Food item not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        return food;
    }

    async searchPublicFoods(queryParams: any) {
        const { name, category, rating, page = 1, limit = 20 } = queryParams;
        const query: any = { foodStatus: true }; // Only active foods

        // 1. Name Filter (Partial Match)
        if (name) {
            query.title = { $regex: new RegExp(name, 'i') };
        }

        // 2. Category Filter (Name or ID)
        if (category) {
            if (Types.ObjectId.isValid(category)) {
                query.categoryId = new Types.ObjectId(category);
            } else {
                // Find category by name first
                const catDoc = await Category.findOne({ categoryName: { $regex: new RegExp(`^${category}$`, 'i') } });
                if (catDoc) {
                    query.categoryId = catDoc._id;
                } else {
                    // Category not found implies no foods for this query
                    return { foods: [], total: 0 };
                }
            }
        }

        // 3. Rating Filter (Minimum)
        if (rating) {
            query.rating = { $gte: Number(rating) };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [foods, total] = await Promise.all([
            Food.find(query)
                .populate('categoryId', 'categoryName')
                .populate('providerId', 'fullName email phone') // Fetch provider details
                .sort({ rating: -1, createdAt: -1 }) // Best rated first
                .skip(skip)
                .limit(Number(limit)),
            Food.countDocuments(query)
        ]);

        return { foods, total, page: Number(page), limit: Number(limit) };
    }
}

export default new FoodService();
