import { Profile } from '../models/profile.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { User } from '../models/user.model';
import AppError from '../utils/AppError';
import { Types } from 'mongoose';

class ProfileService {
    async getProfile(userId: string) {
        // Fetch base user info
        const user = await User.findById(userId).lean();
        if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

        let profile: any = await Profile.findOne({
            userId: new Types.ObjectId(userId)
        }).lean();

        if (!profile) {
            profile = await ProviderProfile.findOne({
                providerId: new Types.ObjectId(userId)
            }).lean();
        }

        if (!profile) {
            throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        // Map and merge for dashboard
        return {
            name: profile.name || user.fullName,
            Role: user.role,
            Email: user.email,
            PhoneNumber: profile.phone || profile.PhoneNumber || '',
            Boi: profile.bio || profile.Boi || '',
            JoinedDate: user.createdAt,
            address: profile.address || '',
            ...profile // Keep raw profile data for other fields
        };
    }

    async updateProfile(userId: string, data: any) {
        // Map custom fields to standard fields
        const updateObj: any = { ...data };
        if (data.PhoneNumber) updateObj.phone = data.PhoneNumber;
        if (data.Boi) updateObj.bio = data.Boi;

        // Also update User model if relevant fields are passed
        if (data.name) {
            await User.findByIdAndUpdate(userId, { fullName: data.name });
        }

        const profile = await Profile.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { $set: updateObj },
            { new: true, runValidators: true }
        ).lean();

        if (!profile) {
            throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        return this.getProfile(userId);
    }


    async deleteProfile(userId: string) {
        const profile = await Profile.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!profile) {
            throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        return true;
    }
}

export default new ProfileService();
