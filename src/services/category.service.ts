import { Category } from '../models/category.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

class CategoryService {
    async createCategory(categoryData: any) {
        const { providerId, categoryName } = categoryData;

        const existingCategory = await Category.findOne({
            providerId: new Types.ObjectId(providerId),
            categoryName: { $regex: new RegExp(`^${categoryName}$`, 'i') },
        });

        if (existingCategory) {
            throw new AppError('Category with this name already exists for your profile', 400, 'DUPLICATE_CATEGORY_ERROR');
        }

        const category = await Category.create({
            ...categoryData,
            providerId: new Types.ObjectId(providerId),
        });

        return category;
    }

    async getProviderCategories(providerId: string) {
        return await Category.find({ providerId: new Types.ObjectId(providerId) }).sort('-createdAt');
    }

    async getAllCategories() {
        return await Category.find({ categoryStatus: true }).sort('categoryName');
    }

    async getCategoryById(categoryId: string, providerId: string) {
        const category = await Category.findOne({
            _id: new Types.ObjectId(categoryId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!category) {
            throw new AppError('Category not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        return category;
    }

    async updateCategory(categoryId: string, providerId: string, updateData: any) {
        const category = await Category.findOne({
            _id: new Types.ObjectId(categoryId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!category) {
            throw new AppError('Category not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        if (updateData.categoryName && updateData.categoryName !== category.categoryName) {
            const existing = await Category.findOne({
                providerId: new Types.ObjectId(providerId),
                categoryName: { $regex: new RegExp(`^${updateData.categoryName}$`, 'i') },
                _id: { $ne: category._id },
            });

            if (existing) {
                throw new AppError('Another category with this name already exists', 400, 'DUPLICATE_CATEGORY_ERROR');
            }
        }

        Object.assign(category, updateData);
        await category.save();

        return category;
    }

    async deleteCategory(categoryId: string, providerId: string) {
        const category = await Category.findOneAndDelete({
            _id: new Types.ObjectId(categoryId),
            providerId: new Types.ObjectId(providerId),
        });

        if (!category) {
            throw new AppError('Category not found or you do not have permission', 404, 'NOT_FOUND_ERROR');
        }

        return category;
    }
}

export default new CategoryService();
