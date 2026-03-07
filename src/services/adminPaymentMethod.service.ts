import { PaymentMethod, CardBrand } from '../models/paymentMethod.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class AdminPaymentMethodService {
    /**
     * Get all payment methods platform-wide (paginated)
     */
    async getAllPaymentMethods(page: number = 1, limit: number = 10, search?: string) {
        const query: any = {};

        if (search) {
            query.$or = [
                { last4: { $regex: search, $options: 'i' } },
                { cardholderName: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        const [methods, total] = await Promise.all([
            PaymentMethod.find(query)
                .populate('userId', 'fullName email role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PaymentMethod.countDocuments(query)
        ]);

        return {
            methods,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Create a payment method for a specific user (Admin override)
     */
    async createPaymentMethod(data: {
        userId: string;
        cardholderName: string;
        brand: string;
        last4: string;
        expiryDate: string;
        isDefault?: boolean;
    }) {
        const mockStripeId = `pm_admin_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        const method = await PaymentMethod.create({
            userId: new Types.ObjectId(data.userId),
            cardholderName: data.cardholderName,
            brand: data.brand || CardBrand.UNKNOWN,
            last4: data.last4,
            expiryDate: data.expiryDate,
            stripePaymentMethodId: mockStripeId,
            isDefault: data.isDefault || false
        });

        return method;
    }

    /**
     * Update a payment method (Admin override)
     */
    async updatePaymentMethod(methodId: string, updateData: any) {
        const method = await PaymentMethod.findById(methodId);
        if (!method) throw new AppError('Payment method not found', 404);

        // Update fields if provided
        if (updateData.cardholderName) method.cardholderName = updateData.cardholderName;
        if (updateData.brand) method.brand = updateData.brand;
        if (updateData.last4) method.last4 = updateData.last4;
        if (updateData.expiryDate) method.expiryDate = updateData.expiryDate;
        if (updateData.isDefault !== undefined) method.isDefault = updateData.isDefault;

        await method.save();
        return method;
    }

    /**
     * Delete a payment method (Admin override)
     */
    async deletePaymentMethod(methodId: string) {
        const method = await PaymentMethod.findByIdAndDelete(methodId);
        if (!method) throw new AppError('Payment method not found', 404);
        return { message: 'Payment method deleted successfully by admin' };
    }
}

export default new AdminPaymentMethodService();
