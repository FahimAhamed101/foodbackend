import { Types } from 'mongoose';
import paymentRepository from '../repositories/payment.repository';
import redis from '../config/redis';
import AppError from '../utils/AppError';

class PaymentService {
    private readonly CACHE_TTL = 1800; // 30 minutes for financial metrics

    /**
     * Get Overview Metrics with Caching
     */
    async getOverview(providerId: string) {
        const pId = new Types.ObjectId(providerId);
        const cacheKey = `payments:overview:${providerId}`;

        try {
            const cached = await redis.get(cacheKey);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.error('Redis error:', e);
        }

        const metrics = await paymentRepository.getMetrics(pId);

        try {
            await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
        } catch (e) {
            console.error('Redis error:', e);
        }

        return metrics;
    }

    /**
     * Get Payment History
     */
    async getPaymentHistory(providerId: string, page: number, limit: number) {
        const pId = new Types.ObjectId(providerId);

        // Enforce maximum limit
        const sanitizedLimit = Math.min(limit, 50);

        return await paymentRepository.getHistory(pId, page, sanitizedLimit);
    }

    /**
     * Search Payments
     */
    async searchPayments(providerId: string, query: string) {
        if (!query || query.length < 3) {
            throw new AppError('Search query must be at least 3 characters long', 400, 'INVALID_SEARCH_QUERY');
        }

        const pId = new Types.ObjectId(providerId);
        const results = await paymentRepository.searchPayments(pId, query);

        if (!results || results.length === 0) {
            throw new AppError('No payments found matching your query', 404, 'PAYMENTS_NOT_FOUND');
        }

        return results;
    }
}

export default new PaymentService();
