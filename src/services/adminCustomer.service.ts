import { Types } from 'mongoose';
import { Order, OrderStatus } from '../models/order.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { User } from '../models/user.model';
import AppError from '../utils/AppError';
import { Profile } from "../models/profile.model";

interface DashboardSummary {
    totalOrders: number;
    totalSpent: number;
    avgOrderValue: number;
}

interface OrderItem {
    orderId: string;
    restaurant: string;
    date: Date;
    amount: number;
    status: string;
}

interface CustomerDashboardResponse {
    CustomarId: string;
    CustomarName: string;
    summary: DashboardSummary;
    pagination: {
        page: number;
        limit: number;
        totalOrders: number;
        totalPages: number;
    };
    orders: OrderItem[];
}

class AdminCustomerService {
    async getCustomerDashboard(
        customerId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<CustomerDashboardResponse> {
        const skip = (page - 1) * limit;
        const customerObjectId = new Types.ObjectId(customerId);

        // check if customer exists
        const user = await User.findById(customerObjectId);
        if (!user) {
            throw new AppError('Customer not found', 404);
        }

        // Aggregation Pipeline
        const result = await Order.aggregate([
            {
                $match: {
                    customerId: customerObjectId
                }
            },
            {
                $facet: {
                    // Summary Metrics
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalOrders: { $sum: 1 },
                                totalSpent: { $sum: '$totalPrice' }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalOrders: 1,
                                totalSpent: 1,
                                avgOrderValue: {
                                    $cond: {
                                        if: { $eq: ['$totalOrders', 0] },
                                        then: 0,
                                        else: { $divide: ['$totalSpent', '$totalOrders'] }
                                    }
                                }
                            }
                        }
                    ],
                    // Paginated Orders List
                    orders: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                        // Lookup restaurant details (ProviderProfile)
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
                                status: 1,
                                restaurant: { $ifNull: ['$providerInfo.restaurantName', 'Unknown Restaurant'] },
                                date: '$createdAt',
                                amount: '$totalPrice'
                            }
                        }
                    ],
                    // Total Count for Pagination
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const summaryData = result[0].summary[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 };
        const ordersData = result[0].orders || [];
        const totalOrdersCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
        const totalPages = Math.ceil(totalOrdersCount / limit);

        return {
            CustomarId: customerId,
            CustomarName: user.fullName,
            summary: {
                totalOrders: summaryData.totalOrders,
                totalSpent: Math.round(summaryData.totalSpent * 100) / 100,
                avgOrderValue: Math.round(summaryData.avgOrderValue * 100) / 100
            },
            pagination: {
                page,
                limit,
                totalOrders: totalOrdersCount,
                totalPages
            },
            orders: ordersData
        };
    }

    async getCustomerProfileDashboard(customerId: string) {
        const customerObjectId = new Types.ObjectId(customerId);

        const user = await User.findById(customerObjectId).lean();
        if (!user) {
            throw new AppError('User not found', 404);
        }

        let stateStr = "Not provided";
        let profilePic = user.profilePic || "";

        const profile = await Profile.findOne({ userId: customerObjectId }).lean();
        if (profile) {
            stateStr = profile.city && profile.state ? `${profile.city} , ${profile.state}` : (profile.state || profile.city || "Not provided");
            profilePic = profile.profilePic || profile.avatar || profilePic;
        } else {
            const providerProfile = await ProviderProfile.findOne({ providerId: customerObjectId }).lean();
            if (providerProfile) {
                stateStr = providerProfile.city && providerProfile.state ? `${providerProfile.city} , ${providerProfile.state}` : (providerProfile.state || providerProfile.city || "Not provided");
                profilePic = providerProfile.profile || profilePic;
            }
        }

        return {
            Name: user.fullName,
            profilePick: profilePic,
            isActive: user.isActive ?? true,
            CustomerID: user._id,
            email: user.email,
            phoen: user.phone || "Not provided",
            state: stateStr,
            date: user.createdAt
        };
    }
}

export default new AdminCustomerService();
