import { Types } from 'mongoose';
import { Order } from '../models/order.model';
import { ProviderProfile } from '../models/providerProfile.model';
import AppError from '../utils/AppError';

interface TransactionSummary {
    grossRevenue: number;
    platformEarnings: number;
    netRestaurantEarnings: number;
}

interface TransactionItem {
    orderId: string;
    customer: string;
    restaurant: string;
    pickupTime: Date;
    status: string;
    amount: number;
    platformFee: number;
}

interface ProviderTransactionResponse {
    restaurantsid: string;
    restaurantsName: string;
    summary: TransactionSummary;
    pagination: {
        page: number;
        limit: number;
        totalOrders: number;
        totalPages: number;
    };
    transactions: TransactionItem[];
}

class AdminTransactionService {
    /**
     * Get Transactions & Orders analytics for a specific Provider or all Providers
     */
    async getTransactions(
        providerId?: string,
        page: number = 1,
        limit: number = 20,
        status?: string,
        timeRange?: string,
        startDate?: string,
        endDate?: string
    ): Promise<ProviderTransactionResponse> {
        const skip = (page - 1) * limit;
        let providerProfile = null;

        // Build Match Query
        const matchQuery: any = {};

        if (providerId && providerId !== 'all_status' && providerId !== '') {
            try {
                const providerObjectId = new Types.ObjectId(providerId);
                providerProfile = await ProviderProfile.findOne({ providerId: providerObjectId });
                matchQuery.providerId = providerObjectId;
            } catch (err) {
                // If invalid ID, don't crash, just skip filter (or throw error, but let's be safe)
            }
        }

        if (status && status !== 'all_status') {
            matchQuery.status = status;
        }

        // Add Date Range Filter
        if (timeRange) {
            const dateFilter = this.getDateRangeFilter(timeRange, startDate, endDate);
            if (dateFilter) {
                matchQuery.createdAt = dateFilter;
            }
        }

        const result = await Order.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    // Summary Metrics (Revenue)
                    summary: [
                        {
                            $group: {
                                _id: null,
                                grossRevenue: { $sum: '$totalPrice' },
                                platformEarnings: { $sum: '$platformFee' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                grossRevenue: 1,
                                platformEarnings: 1,
                                netRestaurantEarnings: { $subtract: ['$grossRevenue', '$platformEarnings'] }
                            }
                        }
                    ],
                    // Transactions List
                    transactions: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        // Lookup Customer Info from Users
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'customerId',
                                foreignField: '_id',
                                as: 'customerInfo'
                            }
                        },
                        {
                            $unwind: {
                                path: '$customerInfo',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        // Lookup Provider/Restaurant info
                        {
                            $lookup: {
                                from: 'providerprofiles',
                                localField: 'providerId',
                                foreignField: 'providerId',
                                as: 'providerInfo'
                            }
                        },
                        {
                            $unwind: {
                                path: '$providerInfo',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                orderId: 1,
                                customer: { $ifNull: ['$customerInfo.fullName', 'Unknown Customer'] },
                                restaurant: { $ifNull: ['$providerInfo.restaurantName', 'Unknown Restaurant'] },
                                pickupTime: { $ifNull: ['$pickupTime', 'Not Scheduled'] },
                                status: 1,
                                amount: '$totalPrice',
                                platformFee: { $ifNull: ['$platformFee', 0] }
                            }
                        }
                    ],
                    // Total Count
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const summaryData = result[0].summary[0] || { grossRevenue: 0, platformEarnings: 0, netRestaurantEarnings: 0 };
        const transactionsData = result[0].transactions || [];
        const totalOrdersCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
        const totalPages = Math.ceil(totalOrdersCount / limit);

        return {
            restaurantsid: providerId || 'Global',
            restaurantsName: providerProfile ? providerProfile.restaurantName : 'All Restaurants',
            summary: {
                grossRevenue: Math.round(summaryData.grossRevenue * 100) / 100,
                platformEarnings: Math.round(summaryData.platformEarnings * 100) / 100,
                netRestaurantEarnings: Math.round(summaryData.netRestaurantEarnings * 100) / 100
            },
            pagination: {
                page,
                limit,
                totalOrders: totalOrdersCount,
                totalPages
            },
            transactions: transactionsData
        };
    }

    /**
     * Helper to calculate date ranges
     */
    private getDateRangeFilter(range: string, customStart?: string, customEnd?: string): any {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));

        switch (range) {
            case 'today':
                return { $gte: startOfDay };

            case 'this_week': {
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay() || 7; // Get current day number, make Sunday (0) -> 7
                if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
                else startOfWeek.setHours(0, 0, 0, 0);
                startOfWeek.setHours(0, 0, 0, 0);
                return { $gte: startOfWeek };
            }

            case 'this_month': {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return { $gte: startOfMonth };
            }

            case 'this_year': {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                return { $gte: startOfYear };
            }

            case 'custom': {
                if (!customStart || !customEnd) return null;
                const start = new Date(customStart);
                const end = new Date(customEnd);

                // Ensure valid dates
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                return { $gte: start, $lte: end };
            }

            default:
                return null;
        }
    }
}

export default new AdminTransactionService();
