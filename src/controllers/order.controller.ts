import { Response } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import orderService from '../services/order.service';
import { catchAsync } from '../utils/catchAsync';
import { OrderStatus } from '../models/order.model';

class OrderController {
    createOrder = catchAsync(async (req: AuthRequest, res: Response) => {
        const customerId = req.user!.userId;
        const order = await orderService.createOrder(customerId, req.body);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order,
        });
    });

    acceptOrder = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const { orderId } = req.params;
        const order = await orderService.updateStatus(orderId as string, providerId, OrderStatus.PREPARING);

        res.status(200).json({
            success: true,
            message: 'Order accepted',
            data: order,
        });
    });

    markReady = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const { orderId } = req.params;
        const order = await orderService.updateStatus(orderId as string, providerId, OrderStatus.READY_FOR_PICKUP);

        res.status(200).json({
            success: true,
            message: 'Order marked as ready for pickup',
            data: order,
        });
    });

    markPickedUp = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const { orderId } = req.params;
        const order = await orderService.updateStatus(orderId as string, providerId, OrderStatus.PICKED_UP);

        res.status(200).json({
            success: true,
            message: 'Order marked as picked up',
            data: order,
        });
    });

    markCompleted = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const { orderId } = req.params;
        const order = await orderService.updateStatus(orderId as string, providerId, OrderStatus.COMPLETED);

        res.status(200).json({
            success: true,
            message: 'Order marked as completed',
            data: order,
        });
    });

    cancelOrder = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const role = req.user!.role; // Assumes role is populated in req.user
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await orderService.cancelOrder(orderId as string, userId, role, reason);

        res.status(200).json({
            success: true,
            message: 'Order cancelled',
            data: order,
        });
    });

    getAllOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { page, limit, ...req.query });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getPendingOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.PENDING, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getPreparingOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.PREPARING, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getReadyOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.READY_FOR_PICKUP, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getPickedUpOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.PICKED_UP, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getCompletedOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.COMPLETED, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });

    getCancelledOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const providerId = req.user!.userId;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await orderService.getProviderOrders(providerId, { status: OrderStatus.CANCELLED, page, limit });

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });
    getOrderDetails = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const role = req.user!.role;
        const { orderId } = req.params;

        const order = await orderService.getOrderById(orderId as string, userId, role);

        res.status(200).json({
            success: true,
            data: order,
        });
    });

    getUserOrders = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user!.userId;
        const role = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const filters: any = { page, limit, ...req.query };
        if (role === 'CUSTOMER') {
            filters.customerId = userId;
        } else {
            filters.providerId = userId;
        }

        const data = await orderService.getOrders(filters);

        res.status(200).json({
            success: true,
            results: data.orders.length,
            pagination: data.pagination,
            data: data.orders,
        });
    });
}

export default new OrderController();
