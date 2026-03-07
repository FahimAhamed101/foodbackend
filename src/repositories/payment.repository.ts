import { Payment, PaymentStatus, PayoutStatus } from '../models/payment.model';
import { Types } from 'mongoose';

class PaymentRepository {
    /**
     * Get financial metrics for provider
     */
    async getMetrics(providerId: Types.ObjectId) {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const metrics = await Payment.aggregate([
            {
                $facet: {
                    currentMonthRevenue: [
                        {
                            $match: {
                                providerId,
                                status: PaymentStatus.COMPLETED,
                                createdAt: { $gte: startOfCurrentMonth },
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$netAmount' } } },
                    ],
                    lastMonthRevenue: [
                        {
                            $match: {
                                providerId,
                                status: PaymentStatus.COMPLETED,
                                createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$netAmount' } } },
                    ],
                    totalCommission: [
                        {
                            $match: {
                                providerId,
                                status: PaymentStatus.COMPLETED,
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$commission' } } },
                    ],
                    pendingPayout: [
                        {
                            $match: {
                                providerId,
                                status: PaymentStatus.COMPLETED,
                                payoutStatus: PayoutStatus.PENDING,
                            },
                        },
                        { $group: { _id: null, total: { $sum: '$netAmount' } } },
                    ],
                },
            },
        ]);

        const data = metrics[0];
        const currentRev = data.currentMonthRevenue[0]?.total || 0;
        const lastRev = data.lastMonthRevenue[0]?.total || 0;
        const commission = data.totalCommission[0]?.total || 0;
        const pending = data.pendingPayout[0]?.total || 0;

        // Calculate growth percentage
        let growth = 0;
        if (lastRev > 0) {
            growth = ((currentRev - lastRev) / lastRev) * 100;
        } else if (currentRev > 0) {
            growth = 100; // 100% growth if starting from data-less month
        }

        return {
            growthThisMonth: parseFloat(growth.toFixed(2)),
            commissionPaid: parseFloat(commission.toFixed(2)),
            pendingPayoutAmount: parseFloat(pending.toFixed(2)),
        };
    }

    /**
     * Get paginated payment history
     */
    async getHistory(providerId: Types.ObjectId, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            Payment.find({ providerId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select('createdAt orderId paymentId totalAmount status netAmount commission payoutStatus')
                .lean(),
            Payment.countDocuments({ providerId }),
        ]);

        return {
            payments: payments.map(p => ({
                id: p._id,
                paymentId: p.paymentId,
                orderId: p.orderId,
                dateTime: p.createdAt,
                amount: p.totalAmount,
                netAmount: p.netAmount,
                commission: p.commission,
                status: p.status,
                payoutStatus: p.payoutStatus
            })),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Search payments by ID or Order ID
     */
    async searchPayments(providerId: Types.ObjectId, query: string) {
        // Use regex for partial, case-insensitive match if needed, 
        // but exact match on IDs is usually preferred for security/performance.
        // Prompt asks for "Case-insensitive" Search.
        const searchRegex = new RegExp(query, 'i');

        const results = await Payment.find({
            providerId,
            $or: [
                { paymentId: { $regex: searchRegex } },
                { orderId: { $regex: searchRegex } }
            ]
        })
            .sort({ createdAt: -1 })
            .limit(20) // Limit search results
            .select('createdAt orderId paymentId totalAmount status netAmount payoutStatus')
            .lean();

        return results;
    }
}

export default new PaymentRepository();
