import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import foodService from '../services/food.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

const parseNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const parseBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
};

const normalizeFoodPayload = (payload: Record<string, unknown>) => {
    const normalized: Record<string, unknown> = { ...payload };

    const calories = parseNumber(payload.calories);
    if (calories !== undefined) normalized.calories = calories;

    const baseRevenue = parseNumber(payload.baseRevenue);
    if (baseRevenue !== undefined) normalized.baseRevenue = baseRevenue;

    const serviceFee = parseNumber(payload.serviceFee);
    if (serviceFee !== undefined) normalized.serviceFee = serviceFee;

    const foodAvailability = parseBoolean(payload.foodAvailability);
    if (foodAvailability !== undefined) normalized.foodAvailability = foodAvailability;

    const foodStatus = parseBoolean(payload.foodStatus);
    if (foodStatus !== undefined) normalized.foodStatus = foodStatus;

    return normalized;
};

class FoodController {
    createFood = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;

        if (!req.file) {
            throw new AppError('Product image file is required', 400, 'IMAGE_REQUIRED');
        }

        const uploadedImage = (req.file as Express.Multer.File & { path?: string }).path;
        if (!uploadedImage) {
            throw new AppError('Uploaded image could not be processed', 400, 'IMAGE_UPLOAD_ERROR');
        }

        const foodData = normalizeFoodPayload(req.body as Record<string, unknown>);
        foodData.image = uploadedImage;

        const food = await foodService.createFood(providerId, foodData);

        res.status(201).json({
            success: true,
            data: food,
        });
    });

    getOwnFoods = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const result = await foodService.getProviderFoods(providerId, req.query);

        res.status(200).json({
            success: true,
            results: result.foods.length,
            meta: result.meta,
            data: result.foods,
        });
    });

    getFoodsByCategory = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const categoryId = req.params.categoryId as string;
        const foods = await foodService.getFoodsByCategory(categoryId, providerId);

        res.status(200).json({
            success: true,
            results: foods.length,
            data: foods,
        });
    });

    getFoodById = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const foodId = req.params.id as string;

        const food = await foodService.getFoodById(foodId, providerId);

        res.status(200).json({
            success: true,
            data: food,
        });
    });

    updateFood = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const foodId = req.params.id as string;

        const updateData = normalizeFoodPayload(req.body as Record<string, unknown>);
        delete updateData.image;

        if (req.file) {
            const uploadedImage = (req.file as Express.Multer.File & { path?: string }).path;
            if (!uploadedImage) {
                throw new AppError('Uploaded image could not be processed', 400, 'IMAGE_UPLOAD_ERROR');
            }
            updateData.image = uploadedImage;
        }

        const food = await foodService.updateFood(foodId, providerId, updateData);

        res.status(200).json({
            success: true,
            data: food,
        });
    });

    deleteFood = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const foodId = req.params.id as string;
        await foodService.deleteFood(foodId, providerId);

        res.status(200).json({
            success: true,
            message: 'Food item deleted successfully from database',
        });
    });

    searchFoods = catchAsync(async (req: AuthRequest, res: Response) => {
        const result = await foodService.searchPublicFoods(req.query);

        // Format data to match specs: name mapped from title, price from finalPriceTag
        const formattedData = result.foods.map((food: any) => ({
            food_id: food._id,
            name: food.title,
            category: food.categoryId?.categoryName || 'Unknown',
            provider: (food.providerId as any)?.fullName || 'Unknown', // Simulating provider name
            rating: food.rating || 0,
            price: food.finalPriceTag,
            productDescription: food.productDescription,
            image: food.image
        }));

        res.status(200).json({
            success: true,
            page: result.page,
            limit: result.limit,
            total: result.total,
            data: formattedData
        });
    });
}

export default new FoodController();
