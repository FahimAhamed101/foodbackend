import { ComplianceViolation, ViolationStatus } from '../models/complianceViolation.model';
import { Food } from '../models/food.model';
import { User } from '../models/user.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class ComplianceService {
    /**
     * Check if a food item violates alcohol policies
     */
    async scanFoodItem(foodId: Types.ObjectId, providerId: Types.ObjectId, title: string, description: string = '') {
        const keywords = ['beer', 'wine', 'cocktail', 'alcohol', 'whiskey', 'vodka', 'gin', 'rum', 'tequila'];
        const content = `${title} ${description}`.toLowerCase();
        const detected = keywords.filter(kw => content.includes(kw));

        if (detected.length > 0) {
            // 1. Create violation record
            await ComplianceViolation.create({
                listingId: foodId,
                providerId,
                issue: detected.length > 1 ? 'Multiple alcohol keywords detected' : 'Alcohol keyword detected',
                detectedKeywords: detected,
                status: ViolationStatus.PENDING,
                severity: 'High'
            });

            // 2. Count total violations for this provider
            const count = await ComplianceViolation.countDocuments({ providerId });

            // 3. Auto-ban if violation count >= 10
            if (count >= 10) {
                await User.findByIdAndUpdate(providerId, {
                    isBlocked: true,
                    blockedReason: 'Automatic ban: Exceeded maximum alcohol compliance violations (10+)'
                });
                return { violationFound: true, providerBanned: true, detected };
            }

            return { violationFound: true, providerBanned: false, detected };
        }

        return { violationFound: false, detected: [] };
    }

    /**
     * Get all violations for Admin dashboard
     */
    async getAdminViolations(queryParams: any) {
        const { search, status, page = 1, limit = 10 } = queryParams;
        const query: any = {};

        if (status) query.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const [violations, total] = await Promise.all([
            ComplianceViolation.find(query)
                .populate('listingId', 'title image')
                .populate('providerId', 'fullName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            ComplianceViolation.countDocuments(query)
        ]);

        return {
            violations: violations.map((v: any) => ({
                id: v._id,
                Listing: v.listingId?.title || 'Deleted Item',
                Image: v.listingId?.image || null,
                Restaurant: v.providerId?.fullName || 'Unknown',
                Issue: v.issue,
                Keywords: v.detectedKeywords,
                Status: v.status,
                Date: v.createdAt,
                Severity: v.severity
            })),
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    /**
     * Update violation status (e.g., Warn, Remove)
     */
    async handleViolationAction(violationId: string, action: 'Warn' | 'Remove') {
        const violation = await ComplianceViolation.findById(violationId);
        if (!violation) throw new AppError('Violation record not found', 404);

        if (action === 'Remove') {
            violation.status = ViolationStatus.REMOVED;
            // Optionally, actually delete or deactivate the food item
            await Food.findByIdAndUpdate(violation.listingId, { foodStatus: false });
        } else if (action === 'Warn') {
            violation.status = ViolationStatus.WARNED;
        }

        await violation.save();
        return violation;
    }
}

export default new ComplianceService();
