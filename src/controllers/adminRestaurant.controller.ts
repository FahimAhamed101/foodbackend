import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import adminRestaurantService from '../services/adminRestaurant.service';

class AdminRestaurantController {
    getDashboardStats = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const stats = await adminRestaurantService.getDashboardStats(restaurantId as string);
        res.status(200).json({ status: 'success', data: stats });
    });

    getProfile = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const profile = await adminRestaurantService.getProfile(restaurantId as string);
        res.status(200).json({ status: 'success', data: profile });
    });

    getPickupWindows = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const windows = await adminRestaurantService.getPickupWindows(restaurantId as string);
        res.status(200).json({ status: 'success', data: windows });
    });

    getActivitySummary = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const summary = await adminRestaurantService.getActivitySummary(restaurantId as string);
        res.status(200).json({ status: 'success', data: summary });
    });

    getCompliance = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const compliance = await adminRestaurantService.getCompliance(restaurantId as string);
        res.status(200).json({ status: 'success', data: compliance });
    });

    getLocation = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const location = await adminRestaurantService.getLocation(restaurantId as string);
        res.status(200).json({ status: 'success', data: location });
    });

    blockRestaurant = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const { reason } = req.body;
        await adminRestaurantService.blockRestaurant(restaurantId as string, reason);
        res.status(200).json({ status: 'success', message: 'Restaurant blocked successfully' });
    });

    unblockRestaurant = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        await adminRestaurantService.unblockRestaurant(restaurantId as string);
        res.status(200).json({ status: 'success', message: 'Restaurant unblocked successfully' });
    });

    approveRestaurant = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        await adminRestaurantService.approveRestaurant(restaurantId as string);
        res.status(200).json({ status: 'success', message: 'Restaurant approved successfully' });
    });

    rejectRestaurant = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const { reason } = req.body;
        await adminRestaurantService.rejectRestaurant(restaurantId as string, reason);
        res.status(200).json({ status: 'success', message: 'Restaurant rejected successfully' });
    });

    getProviderOrderHistory = catchAsync(async (req: Request, res: Response) => {
        const { providerId } = req.params;
        const orders = await adminRestaurantService.getProviderOrderHistory(providerId as string);
        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    });

    getProviderReviews = catchAsync(async (req: Request, res: Response) => {
        const { providerId } = req.params;
        const { rating, page, limit } = req.query;

        const result = await adminRestaurantService.getProviderReviews(providerId as string, {
            rating: rating ? Number(rating) : undefined,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20
        });

        res.status(200).json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    getAllRestaurants = catchAsync(async (req: Request, res: Response) => {
        // Pass entire query object to service
        const result = await adminRestaurantService.getAllRestaurants(req.query);

        res.status(200).json({
            success: true,
            pagination: result.pagination,
            restaurants: result.restaurants
        });
    });

    getRestaurantDetails = catchAsync(async (req: Request, res: Response) => {
        const { restaurantId } = req.params;
        const restaurant = await adminRestaurantService.getRestaurantDetails(restaurantId as string);

        res.status(200).json({
            success: true,
            data: restaurant
        });
    });
}

export default new AdminRestaurantController();
