import { Order, OrderStatus } from '../models/order.model';
import { Profile } from '../models/profile.model';
import { Types } from 'mongoose';

class AnalyticsRepository {
    /**
     * Get Overview Metrics
     */
    async getOverview(providerId: Types.ObjectId) {
        const stats = await Order.aggregate([
            { $match: { providerId, status: OrderStatus.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalPrice' },
                    totalOrders: { $sum: 1 },
                },
            },
        ]);

        const topState = await Order.aggregate([
            { $match: { providerId, status: OrderStatus.COMPLETED } },
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'customerId',
                    foreignField: 'userId',
                    as: 'customerProfile',
                },
            },
            { $unwind: '$customerProfile' },
            {
                $group: {
                    _id: '$customerProfile.state',
                    revenue: { $sum: '$totalPrice' },
                },
            },
            { $sort: { revenue: -1 } },
            { $limit: 1 },
        ]);

        const data = stats[0] || { totalRevenue: 0, totalOrders: 0 };
        return {
            totalRevenue: data.totalRevenue,
            totalOrders: data.totalOrders,
            avgOrderValue: data.totalOrders > 0 ? parseFloat((data.totalRevenue / data.totalOrders).toFixed(2)) : 0,
            topPerformingState: topState[0]?._id || 'N/A',
        };
    }

    /**
     * Get Revenue & Order Distribution Performance (Weekly)
     */
    async getWeeklyPerformance(providerId: Types.ObjectId) {
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const performance = await Order.aggregate([
            {
                $match: {
                    providerId,
                    status: OrderStatus.COMPLETED,
                    createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) },
                },
            },
            {
                $group: {
                    _id: { $dayOfWeek: '$createdAt' },
                    revenue: { $sum: '$totalPrice' },
                    orders: { $sum: 1 },
                },
            },
        ]);

        const revenuePerformance: any = {};
        const orderDistribution: any = {};

        // Initialize with 0
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(day => {
            revenuePerformance[day] = 0;
            orderDistribution[day] = 0;
        });

        performance.forEach(p => {
            const dayName = daysMap[p._id - 1]; // MongoDB 1 (Sun) to 7 (Sat)
            revenuePerformance[dayName] = p.revenue;
            orderDistribution[dayName] = p.orders;
        });

        return { revenuePerformance, orderDistribution };
    }

    /**
     * Get User Distribution by City
     */
    async getUserDistributionByCity(providerId: Types.ObjectId) {
        const distribution = await Order.aggregate([
            { $match: { providerId, status: OrderStatus.COMPLETED } },
            {
                $lookup: {
                    from: 'profiles',
                    localField: 'customerId',
                    foreignField: 'userId',
                    as: 'customerProfile',
                },
            },
            { $unwind: '$customerProfile' },
            {
                $group: {
                    _id: { $ifNull: ['$customerProfile.city', 'Unknown'] },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const top7 = distribution.slice(0, 7);
        const othersCount = distribution.slice(7).reduce((acc, curr) => acc + curr.count, 0);

        const result: any = {};
        top7.forEach(item => {
            result[item._id] = item.count;
        });

        if (othersCount > 0) {
            result['Others'] = othersCount;
        }

        return result;
    }

    /**
     * Get Category Mix Analytics
     */
    async getCategoryMix(providerId: Types.ObjectId) {
        const categories = await Order.aggregate([
            { $match: { providerId, status: OrderStatus.COMPLETED } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'items.foodId',
                    foreignField: '_id',
                    as: 'foodInfo',
                },
            },
            { $unwind: '$foodInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'foodInfo.categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo.categoryName',
                    sales: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                },
            },
        ]);

        const totalSales = categories.reduce((acc, curr) => acc + curr.sales, 0);
        const result: any = {};

        categories.forEach(cat => {
            result[cat._id] = totalSales > 0 ? `${((cat.sales / totalSales) * 100).toFixed(1)}%` : '0%';
        });

        return result;
    }

    /**
     * Get Hourly Peak Activity
     */
    async getHourlyPeakActivity(providerId: Types.ObjectId) {
        const hourlyData = await Order.aggregate([
            { $match: { providerId, status: OrderStatus.COMPLETED } },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const result: any = {};
        // Initialize all 24 hours
        for (let i = 0; i < 24; i++) {
            const hourStr = `${i.toString().padStart(2, '0')}:00`;
            result[hourStr] = 0;
        }

        hourlyData.forEach(item => {
            const hourStr = `${item._id.toString().padStart(2, '0')}:00`;
            result[hourStr] = item.count;
        });

        return result;
    }
}

export default new AnalyticsRepository();
