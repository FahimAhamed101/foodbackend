import { Types } from 'mongoose';
import { User, UserRole } from '../models/user.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Food } from '../models/food.model';
import AppError from '../utils/AppError';

interface UserFilters {
    role: UserRole;
    status?: string;
    page: number;
    limit: number;
}

class AdminUserService {
    async getUsersByRole(filters: UserFilters) {
        const { role, status, page, limit } = filters;
        const skip = (page - 1) * limit;

        const matchStage: any = { role };

        if (status && status !== 'all_status') {
            if (status === 'active') matchStage.isActive = true;
            if (status === 'suspended') matchStage.isSuspended = true;
        }

        const profileCollection = role === UserRole.PROVIDER ? 'providerprofiles' : 'profiles';

        const pipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: profileCollection,
                    localField: '_id',
                    foreignField: role === UserRole.PROVIDER ? 'providerId' : 'userId',
                    as: 'profile'
                }
            },
            { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'foods',
                    localField: '_id',
                    foreignField: 'providerId',
                    as: 'foods'
                }
            },
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'providerId',
                    as: 'userReviews'
                }
            },
            {
                $project: {
                    _id: 1,
                    providerID: '$_id',
                    fullName: 1,
                    email: 1,
                    status: {
                        $cond: {
                            if: { $eq: ['$isSuspended', true] },
                            then: 'suspended',
                            else: {
                                $cond: {
                                    if: { $eq: ['$isActive', false] },
                                    then: 'blocked',
                                    else: 'approved'
                                }
                            }
                        }
                    },
                    createdAt: 1,
                    updatedAt: 1,
                    id: { $ifNull: ['$profile._id', '$_id'] },
                    userId: '$_id',
                    profilePicture: { $ifNull: ['$profile.profilePic', '$profile.profile', '$profilePic', ''] },
                    coverPhoto: { $ifNull: ['$profile.coverPhoto', null] },
                    bio: { $ifNull: ['$profile.bio', ''] },
                    ownersName: { $ifNull: ['$profile.ownersName', null] },
                    phoneNumber: { $ifNull: ['$profile.phone', '$phone', ''] },
                    companyName: { $ifNull: ['$profile.restaurantName', '$profile.companyName', null] },
                    followers: { $ifNull: ['$profile.followers', 0] },
                    reviews: {
                        averageRating: { $ifNull: [{ $avg: '$userReviews.rating' }, 0] },
                        totalReviews: { $size: '$userReviews' }
                    },
                    serviceCategories: { $ifNull: ['$profile.cuisine', '$profile.serviceCategories', []] },
                    totalUpload: {
                        totalService: { $size: '$foods' }
                    },
                    isPayment: { $ifNull: ['$profile.isPayment', false] },
                    facebook: { $ifNull: ['$profile.facebook', ''] },
                    instagram: { $ifNull: ['$profile.instagram', ''] },
                    website: { $ifNull: ['$profile.website', ''] },
                    address: { $ifNull: ['$profile.address', ''] },
                    location: { $ifNull: ['$profile.location', null] },
                    curatedLatitude: { $ifNull: ['$profile.location.lat', null] },
                    curatedLongitude: { $ifNull: ['$profile.location.lng', null] }
                }
            },
            {
                $facet: {
                    metadata: [{ $count: 'total' }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit }
                    ]
                }
            }
        ];

        const result = await User.aggregate(pipeline);
        const total = result[0].metadata[0]?.total || 0;
        const data = result[0].data;

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async blockUser(userId: string, reason: string) {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isActive: false,
                isSuspended: true,
                suspendedReason: reason,
                suspendedAt: new Date()
            },
            { new: true }
        );

        if (!user) throw new AppError('User not found', 404);

        if (user.role === UserRole.PROVIDER) {
            await ProviderProfile.findOneAndUpdate(
                { providerId: userId },
                { status: 'BLOCKED', isActive: false, blockReason: reason }
            );
            await Food.updateMany({ providerId: userId }, { foodStatus: false });
        }

        return user;
    }

    async unblockUser(userId: string) {
        const user = await User.findByIdAndUpdate(
            userId,
            {
                isActive: true,
                isSuspended: false,
                $unset: { suspendedReason: 1, suspendedAt: 1 }
            },
            { new: true }
        );

        if (!user) throw new AppError('User not found', 404);

        if (user.role === UserRole.PROVIDER) {
            await ProviderProfile.findOneAndUpdate(
                { providerId: userId },
                { status: 'ACTIVE', isActive: true, $unset: { blockReason: 1 } }
            );
            await Food.updateMany({ providerId: userId }, { foodStatus: true });
        }

        return user;
    }
}

export default new AdminUserService();
