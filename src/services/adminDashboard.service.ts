import { Types } from 'mongoose';
import { Order, OrderStatus } from '../models/order.model';
import { Review } from '../models/review.model';
import { ProviderProfile } from '../models/providerProfile.model';
import AppError from '../utils/AppError';

interface IncomeAndVolResult {
    _id: string | number;
    totalIncome: number;
    orderCount: number;
}

interface ActiveCustomersResult {
    _id: string | number;
    customerCount: number;
}

interface StateAnalysisResult {
    _id: string;
    count: number;
}

class AdminDashboardService {
    /**
     * API 1: Orders & Analytics Overview
     * Fetch overall statistics for a specific restaurant/provider.
     */
    async getAnalyticsOverview(providerId: string) {
        if (!Types.ObjectId.isValid(providerId)) {
            throw new AppError('Invalid Provider ID', 400);
        }

        const pId = new Types.ObjectId(providerId);

        const stats = await Order.aggregate([
            { $match: { providerId: pId } },
            {
                $facet: {
                    orderCounts: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    profitData: [
                        {
                            $group: {
                                _id: null,
                                totalPlatformProfit: { $sum: '$platformFee' }
                            }
                        }
                    ]
                }
            }
        ]);

        const orderCountsRaw = stats[0].orderCounts;
        const profit = stats[0].profitData[0]?.totalPlatformProfit || 0;

        // Process status counts
        const statusMap: any = {
            totalOrders: 0,
            pendingOrders: 0,
            completedOrders: 0
        };

        orderCountsRaw.forEach((item: any) => {
            statusMap.totalOrders += item.count;
            if (item._id === OrderStatus.PENDING) {
                statusMap.pendingOrders += item.count;
            } else if (item._id === OrderStatus.COMPLETED || item._id === OrderStatus.PICKED_UP) {
                statusMap.completedOrders += item.count;
            }
        });

        // Sustainability Metric: 0.5kg CO2 reduced per completed order as a proxy for delivery optimization
        const co2Reduced = statusMap.completedOrders * 0.5;

        return {
            OrdersOverview: {
                totalOrders: statusMap.totalOrders,
                pendingOrders: statusMap.pendingOrders,
                completedOrders: statusMap.completedOrders
            },
            "CO2Reduced(kg)": co2Reduced,
            platformProfit: parseFloat(profit.toFixed(2))
        };
    }

    /**
     * API 2: Customer Feedback
     * Get aggregated customer ratings for the restaurant/provider.
     */
    async getCustomerFeedback(providerId: string) {
        if (!Types.ObjectId.isValid(providerId)) {
            throw new AppError('Invalid Provider ID', 400);
        }

        const pId = new Types.ObjectId(providerId);

        const feedback = await Review.aggregate([
            { $match: { providerId: pId } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const ratingDistribution: any = {
            "1Stars": 0,
            "2Stars": 0,
            "3Stars": 0,
            "4Stars": 0,
            "5Stars": 0
        };

        feedback.forEach((item: any) => {
            const key = `${item._id}Stars`;
            if (ratingDistribution.hasOwnProperty(key)) {
                ratingDistribution[key] = item.count;
            }
        });

        return {
            CustomerFeedback: ratingDistribution
        };
    }

    /**
     * API 3: Top Performing Restaurants
     * Fetch top performing restaurants across the platform.
     */
    async getTopPerformingRestaurants(page: number = 1, limit: number = 5) {
        const skip = (page - 1) * limit;

        const results = await Order.aggregate([
            {
                $match: {
                    status: { $in: [OrderStatus.COMPLETED, OrderStatus.PICKED_UP] }
                }
            },
            {
                $group: {
                    _id: '$providerId',
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalPrice' }
                }
            },
            { $sort: { totalRevenue: -1, totalOrders: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'providerprofiles',
                    localField: '_id',
                    foreignField: 'providerId',
                    as: 'profile'
                }
            },
            { $unwind: '$profile' },
            {
                $project: {
                    _id: 0,
                    providerId: '$_id',
                    RestaurantName: '$profile.restaurantName',
                    TotalOrders: '$totalOrders',
                    TotalRevenue: { $round: ['$totalRevenue', 2] }
                }
            }
        ]);

        return results.map((item, index) => ({
            Rank: skip + index + 1,
            ...item
        }));
    }

    /**
     * API 4: Dashboard Detailed Stats (for charts)
     * Handles 4 types of analysis: Income, Volume, Active Customers, and State-based.
     */
    async getDashboardDetailedStats(timeRange: string = 'today', customStartDate?: string, customEndDate?: string) {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;
        let groupBy: any;
        let format: string;

        switch (timeRange.toLowerCase()) {
            case 'custom':
                if (!customStartDate || !customEndDate) {
                    throw new AppError('Custom date range requires startDate and endDate (DD-MM-YYYY)', 400);
                }
                const [sDay, sMonth, sYear] = customStartDate.split('-').map(Number);
                const [eDay, eMonth, eYear] = customEndDate.split('-').map(Number);
                startDate = new Date(sYear, sMonth - 1, sDay, 0, 0, 0);
                endDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59);
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
                format = "Custom";
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
                format = "Daily";
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
                format = "Daily";
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                groupBy = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
                format = "Monthly";
                break;
            case 'today':
            default:
                startDate = new Date(now.setHours(0, 0, 0, 0));
                groupBy = { $hour: "$createdAt" };
                format = "Hourly";
                break;
        }

        const matchStage = {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                status: { $ne: OrderStatus.CANCELLED }
            }
        };

        const stats = await Order.aggregate([
            matchStage,
            {
                $facet: {
                    incomeAndVol: [
                        {
                            $group: {
                                _id: groupBy,
                                totalIncome: { $sum: "$totalPrice" },
                                orderCount: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    activeCustomers: [
                        {
                            $group: {
                                _id: groupBy,
                                customers: { $addToSet: "$customerId" }
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                customerCount: { $size: "$customers" }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    stateAnalysis: [
                        {
                            $group: {
                                _id: "$state",
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]
                }
            }
        ]);

        const result = stats[0] as {
            incomeAndVol: IncomeAndVolResult[];
            activeCustomers: ActiveCustomersResult[];
            stateAnalysis: StateAnalysisResult[];
        };

        return {
            timeRange,
            format,
            incomeOverview: result.incomeAndVol.map((item: IncomeAndVolResult) => ({
                label: item._id,
                income: parseFloat(item.totalIncome.toFixed(2))
            })),
            orderVolume: result.incomeAndVol.map((item: IncomeAndVolResult) => ({
                label: item._id,
                count: item.orderCount
            })),
            activeCustomers: result.activeCustomers.map((item: ActiveCustomersResult) => ({
                label: item._id,
                count: item.customerCount
            })),
            stateAnalysis: result.stateAnalysis.map((item: StateAnalysisResult) => ({
                state: item._id || 'Unknown',
                count: item.count
            }))
        };
    }
}

export default new AdminDashboardService();
