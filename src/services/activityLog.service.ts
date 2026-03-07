import { AuditLog, AuditEventType, RiskLevel } from '../models/auditLog.model';
import { Types } from 'mongoose';

export interface LogActivityParams {
    userId?: string;
    email?: string;
    eventType: AuditEventType;
    action: string;
    resource?: string;
    result?: 'success' | 'failure';
    metadata?: Record<string, any>;
    riskLevel?: RiskLevel;
    ipAddress?: string;
}

class ActivityLogService {
    /**
     * Log a new activity/audit event
     */
    async logActivity(params: LogActivityParams) {
        try {
            const log = await AuditLog.create({
                ...params,
                userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
                result: params.result || 'success',
                riskLevel: params.riskLevel || RiskLevel.LOW,
            });
            return log;
        } catch (error) {
            console.error('Error logging activity:', error);
            // We don't throw error here to prevent blocking main business logic
        }
    }

    /**
     * Get activities for Admin (Global)
     */
    async getGlobalActivities(page: number = 1, limit: number = 10, filters: any = {}) {
        const skip = (page - 1) * limit;

        const query: any = { ...filters };

        const [activities, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'fullName profilePic role')
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        return {
            activities,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get activities for a specific Provider (Restaurant)
     */
    async getProviderActivities(providerId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        // Providers should see:
        // 1. Their own actions
        // 2. Actions related to their restaurant (metadata.providerId matches)
        const query = {
            $or: [
                { userId: new Types.ObjectId(providerId) },
                { 'metadata.providerId': providerId }
            ]
        };

        const [activities, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'fullName profilePic role')
                .lean(),
            AuditLog.countDocuments(query)
        ]);

        return {
            activities,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

export default new ActivityLogService();
