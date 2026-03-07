import { Types } from 'mongoose';
import analyticsRepository from '../repositories/analytics.repository';
import redis from '../config/redis';
import AppError from '../utils/AppError';
import systemConfigService from './systemConfig.service';

class AnalyticsService {
    private readonly CACHE_TTL = 3600; // 1 hour

    /**
     * Get Consolidated Analytics Insights
     */
    async getProviderInsights(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        // Try to get from cache
        const cacheKey = `analytics:insights:${providerId}`;
        try {
            const cachedData = await redis.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } catch (error) {
            console.error('Redis Error:', error);
            // Continue without cache
        }

        // Fetch all metrics in parallel
        const [
            overview,
            weeklyStats,
            userDistributionByCity,
            categoryMix,
            hourlyPeakActivity,
            permissions
        ] = await Promise.all([
            analyticsRepository.getOverview(pId),
            analyticsRepository.getWeeklyPerformance(pId),
            analyticsRepository.getUserDistributionByCity(pId),
            analyticsRepository.getCategoryMix(pId),
            analyticsRepository.getHourlyPeakActivity(pId),
            systemConfigService.getRestaurantDashboardPermissions()
        ]);

        const finalInsights = {
            overview,
            revenuePerformance: weeklyStats.revenuePerformance,
            orderDistribution: weeklyStats.orderDistribution,
            userDistributionByCity: permissions.showUserDistributionByCity ? userDistributionByCity : [],
            categoryMix,
            hourlyPeakActivity,
        };

        // Cache the result
        try {
            await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(finalInsights));
        } catch (error) {
            console.error('Redis Cache Error:', error);
        }

        return finalInsights;
    }

    private async getOrSetCache<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
        try {
            const cached = await redis.get(key);
            if (cached) return JSON.parse(cached);
        } catch (e) {
            console.error('Cache Get Error:', e);
        }

        const data = await fetchFn();

        try {
            await redis.setex(key, this.CACHE_TTL, JSON.stringify(data));
        } catch (e) {
            console.error('Cache Set Error:', e);
        }

        return data;
    }

    async getOverview(providerId: string) {
        return this.getOrSetCache(`analytics:overview:${providerId}`, () =>
            analyticsRepository.getOverview(new Types.ObjectId(providerId))
        );
    }

    async getRevenuePerformance(providerId: string) {
        return this.getOrSetCache(`analytics:revenue:${providerId}`, async () => {
            const stats = await analyticsRepository.getWeeklyPerformance(new Types.ObjectId(providerId));
            return stats.revenuePerformance;
        });
    }

    async getOrderDistribution(providerId: string) {
        return this.getOrSetCache(`analytics:orders:${providerId}`, async () => {
            const stats = await analyticsRepository.getWeeklyPerformance(new Types.ObjectId(providerId));
            return stats.orderDistribution;
        });
    }

    async getUserDistribution(providerId: string) {
        const permissions = await systemConfigService.getRestaurantDashboardPermissions();
        if (!permissions.showUserDistributionByCity) return [];

        return this.getOrSetCache(`analytics:users:${providerId}`, () =>
            analyticsRepository.getUserDistributionByCity(new Types.ObjectId(providerId))
        );
    }

    async getCategoryMix(providerId: string) {
        return this.getOrSetCache(`analytics:categories:${providerId}`, () =>
            analyticsRepository.getCategoryMix(new Types.ObjectId(providerId))
        );
    }

    async getHourlyActivity(providerId: string) {
        return this.getOrSetCache(`analytics:hourly:${providerId}`, () =>
            analyticsRepository.getHourlyPeakActivity(new Types.ObjectId(providerId))
        );
    }
}

export default new AnalyticsService();
