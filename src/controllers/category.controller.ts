import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import categoryService from '../services/category.service';
import { catchAsync } from '../utils/catchAsync';

class CategoryController {
    createCategory = catchAsync(async (req: any, res: Response) => {
        const providerId = req.user!.userId;


        const image = req.body.image || (req.file ? req.file.path : '');

        const category = await categoryService.createCategory({
            ...req.body,
            image,
            providerId
        });

        res.status(201).json({
            success: true,
            data: category,
        });
    });

    getOwnCategories = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const categories = await categoryService.getProviderCategories(providerId);

        res.status(200).json({
            success: true,
            results: categories.length,
            data: categories,
        });
    });

    getAllCategories = catchAsync(async (req: any, res: Response) => {
        const categories = await categoryService.getAllCategories();

        res.status(200).json({
            success: true,
            results: categories.length,
            data: categories,
        });
    });

    getCategoryById = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const categoryId = req.params.id as string;

        const category = await categoryService.getCategoryById(categoryId, providerId);

        res.status(200).json({
            success: true,
            data: category,
        });
    });

    updateCategory = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const categoryId = req.params.id as string;

        const category = await categoryService.updateCategory(categoryId, providerId, req.body);

        res.status(200).json({
            success: true,
            data: category,
        });
    });

    deleteCategory = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const categoryId = req.params.id as string;

        await categoryService.deleteCategory(categoryId, providerId);

        res.status(200).json({
            success: true,
            message: 'Category deleted successfully from database',
        });
    });
}

export default new CategoryController();
