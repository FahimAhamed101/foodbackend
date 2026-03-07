import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import bannerService from '../services/banner.service';

class BannerController {
    createBanner = catchAsync(async (req: Request, res: Response) => {
        const banner = await bannerService.createBanner(req.body);
        res.status(201).json({
            success: true,
            data: banner
        });
    });

    updateBanner = catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const banner = await bannerService.updateBanner(id, req.body);
        res.status(200).json({
            success: true,
            data: banner
        });
    });

    deleteBanner = catchAsync(async (req: Request, res: Response) => {
        const id = req.params.id as string;
        const result = await bannerService.softDeleteBanner(id);
        res.status(200).json({
            success: true,
            ...result
        });
    });

    getActiveBanners = catchAsync(async (req: Request, res: Response) => {
        const banners = await bannerService.getActiveBanners();
        res.status(200).json({
            success: true,
            results: banners.length,
            data: banners
        });
    });

    listAllBanners = catchAsync(async (req: Request, res: Response) => {
        const result = await bannerService.getAllBanners(req.query);
        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default new BannerController();
