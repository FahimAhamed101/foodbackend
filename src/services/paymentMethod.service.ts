import { PaymentMethod } from '../models/paymentMethod.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

class PaymentMethodService {
    /**
     * Get all payment methods for a user
     */
    async getPaymentMethods(userId: string) {
        return await PaymentMethod.find({ userId: new Types.ObjectId(userId) })
            .sort({ isDefault: -1, createdAt: -1 });
    }

    /**
     * Add a new payment method
     * In a real app, this would integrate with Stripe. This implementation 
     * extracts card details into a 'secure' representation.
     */
    async addPaymentMethod(userId: string, data: any) {
        // Mock Stripe Logic: In real life, we getpm_... from Stripe
        const mockStripeId = `pm_mock_${Math.random().toString(36).substr(2, 9)}`;

        // Extract basic info from the card number for display (last 4)
        const cardNumber = data.cardNumber.replace(/\s/g, '');
        const last4 = cardNumber.slice(-4);

        // Simple Brand Detection
        let brand = 'Unknown';
        if (cardNumber.startsWith('4')) brand = 'Visa';
        else if (cardNumber.startsWith('5')) brand = 'MasterCard';

        const paymentMethod = await PaymentMethod.create({
            userId: new Types.ObjectId(userId),
            cardholderName: data.cardholderName,
            brand: brand,
            last4: last4,
            expiryDate: data.expiryDate,
            stripePaymentMethodId: mockStripeId,
            isDefault: data.isDefault || false
        });

        // If this is the first card, make it default
        const count = await PaymentMethod.countDocuments({ userId: new Types.ObjectId(userId) });
        if (count === 1) {
            paymentMethod.isDefault = true;
            await paymentMethod.save();
        }

        return paymentMethod;
    }

    /**
     * Set a payment method as default
     */
    async setDefault(userId: string, methodId: string) {
        const method = await PaymentMethod.findOne({
            _id: new Types.ObjectId(methodId),
            userId: new Types.ObjectId(userId)
        });

        if (!method) throw new AppError('Payment method not found', 404);

        method.isDefault = true;
        await method.save(); // Model pre-save hook handles clearing others

        return method;
    }

    /**
     * Delete a payment method
     */
    async deletePaymentMethod(userId: string, methodId: string) {
        const method = await PaymentMethod.findOneAndDelete({
            _id: new Types.ObjectId(methodId),
            userId: new Types.ObjectId(userId)
        });

        if (!method) throw new AppError('Payment method not found', 404);

        // If we deleted the default card, assign a new default if possible
        if (method.isDefault) {
            const nextBest = await PaymentMethod.findOne({ userId: new Types.ObjectId(userId) });
            if (nextBest) {
                nextBest.isDefault = true;
                await nextBest.save();
            }
        }

        return { message: 'Payment method removed successfully' };
    }
}

export default new PaymentMethodService();
