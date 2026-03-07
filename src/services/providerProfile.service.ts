import { ProviderProfile } from '../models/providerProfile.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class ProviderProfileService {

    /**
     * Get Provider Profile
     * Returns profile even if inactive (social style)
     */
    async getProfile(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        const [profile, reviewStats] = await Promise.all([
            ProviderProfile.findOne({ providerId: pId }).lean(),
            import('../models/review.model').then(({ Review }) =>
                Review.aggregate([
                    { $match: { providerId: pId } },
                    {
                        $group: {
                            _id: null,
                            totalReviews: { $sum: 1 },
                            averageRating: { $avg: '$rating' }
                        }
                    }
                ])
            )
        ]);

        if (!profile) {
            throw new AppError('Provider profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        const stats = reviewStats[0] || { totalReviews: 0, averageRating: 0 };

        return {
            ...(profile as any),
            totalReviews: stats.totalReviews || 0,
            AverageReviews: stats.averageRating ? stats.averageRating.toFixed(1) : "0.0",
            lat: profile.location?.lat,
            lng: profile.location?.lng,
            restaurantAddress: profile.restaurantAddress || 'To be updated'
        };
    }

    /**
     * Update Provider Profile
     * Works even on inactive profiles
     */
    async updateProfile(providerId: string, updateData: any) {
        const pId = new Types.ObjectId(providerId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: pId },
            { $set: updateData },
            { new: true, runValidators: true }
        ).lean();

        if (!profile) {
            throw new AppError('Provider profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        // Fetch review stats again to return consistent response
        const stats = await import('../models/review.model').then(({ Review }) =>
            Review.aggregate([
                { $match: { providerId: pId } },
                {
                    $group: {
                        _id: null,
                        totalReviews: { $sum: 1 },
                        averageRating: { $avg: '$rating' }
                    }
                }
            ])
        ).then(res => res[0] || { totalReviews: 0, averageRating: 0 });

        return {
            ...(profile as any),
            totalReviews: stats.totalReviews || 0,
            AverageReviews: stats.averageRating ? stats.averageRating.toFixed(1) : "0.0",
            lat: profile.location?.lat,
            lng: profile.location?.lng,
            restaurantAddress: profile.restaurantAddress || 'To be updated'
        };
    }

    /**
     * Delete Provider Profile (Soft Delete)
     * Marks as inactive, data stays in database
     */
    async deleteProfile(providerId: string) {
        const pId = new Types.ObjectId(providerId);

        const profile = await ProviderProfile.findOneAndUpdate(
            { providerId: pId },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!profile) {
            throw new AppError('Provider profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        return true;
    }
}

export default new ProviderProfileService();
