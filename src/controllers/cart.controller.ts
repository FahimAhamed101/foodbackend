import { Response } from 'express';
import cartService from '../services/cart.service';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../middlewares/authenticate';

class CartController {
    /**
     * GET /api/v1/cart
     * Get current user's cart
     */
    getCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const cart = await cartService.getCart(userId!);

        res.status(200).json({
            success: true,
            data: cart,
        });
    });

    /**
     * POST /api/v1/cart/add
     * Add item to cart
     */
    addToCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { foodId, quantity } = req.body;

        const cart = await cartService.addToCart(userId!, foodId, quantity);

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            data: cart,
        });
    });

    /**
     * PATCH /api/v1/cart/update
     * Update item quantity
     */
    updateCartItem = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { foodId, quantity } = req.body;

        const cart = await cartService.updateCartItem(userId!, foodId, quantity);

        res.status(200).json({
            success: true,
            message: 'Cart updated',
            data: cart,
        });
    });

    /**
     * DELETE /api/v1/cart/remove
     * Remove item from cart
     */
    removeFromCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const { foodId } = req.body;

        const cart = await cartService.removeFromCart(userId!, foodId);

        res.status(200).json({
            success: true,
            message: 'Item removed from cart',
            data: cart,
        });
    });

    /**
     * DELETE /api/v1/cart/clear
     * Clear entire cart
     */
    clearCart = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const cart = await cartService.clearCart(userId!);

        res.status(200).json({
            success: true,
            message: 'Cart cleared',
            data: cart,
        });
    });

    /**
     * GET /api/v1/cart/count
     * Get cart item count (for badge)
     */
    getCartCount = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        const data = await cartService.getCartCount(userId!);

        res.status(200).json({
            success: true,
            data,
        });
    });
}

export default new CartController();
