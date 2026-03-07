import { Banner, BannerStatus } from '../models/banner.model';
import AppError from '../utils/AppError';

class BannerService {
    async createBanner(data: any) {
        if (data.startTime && typeof data.startTime === 'string') {
            const [day, month, year] = data.startTime.split('-').map(Number);
            data.startTime = new Date(year, month - 1, day);
        }
        if (data.endTime && typeof data.endTime === 'string') {
            const [day, month, year] = data.endTime.split('-').map(Number);
            data.endTime = new Date(year, month - 1, day);
        }
        return await Banner.create(data);
    }

    async updateBanner(id: string, data: any) {
        if (data.startTime && typeof data.startTime === 'string') {
            const [day, month, year] = data.startTime.split('-').map(Number);
            data.startTime = new Date(year, month - 1, day);
        }
        if (data.endTime && typeof data.endTime === 'string') {
            const [day, month, year] = data.endTime.split('-').map(Number);
            data.endTime = new Date(year, month - 1, day);
        }
        const banner = await Banner.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $set: data },
            { new: true, runValidators: true }
        );

        if (!banner) {
            throw new AppError('Banner not found', 404);
        }

        return banner;
    }

    async softDeleteBanner(id: string) {
        const banner = await Banner.findOneAndUpdate(
            { _id: id, isDeleted: false },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    status: BannerStatus.INACTIVE
                }
            },
            { new: true }
        );

        if (!banner) {
            throw new AppError('Banner not found', 404);
        }

        return { message: 'Banner deleted successfully' };
    }

    private _formatBanner(banner: any) {
        if (!banner) return banner;
        const formatDate = (date: any) => {
            if (!date) return null;
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };
        return {
            ...banner,
            startTime: formatDate(banner.startTime),
            endTime: formatDate(banner.endTime)
        };
    }

    async getActiveBanners() {
        const now = new Date();

        // Find banners that are ACTIVE, not deleted, and within the time range
        const banners = await Banner.find({
            status: BannerStatus.ACTIVE,
            isDeleted: false,
            startTime: { $lte: now },
            endTime: { $gte: now }
        }).sort({ startTime: -1 }).lean();

        return banners.map(banner => this._formatBanner(banner));
    }

    async getAllBanners(filters: any) {
        const { status, search, page = 1, limit = 10 } = filters;
        const query: any = { isDeleted: false };

        if (status) query.status = status;
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [banners, total] = await Promise.all([
            Banner.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Banner.countDocuments(query)
        ]);

        return {
            banners: banners.map(banner => this._formatBanner(banner)),
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        };
    }
}

export default new BannerService();
