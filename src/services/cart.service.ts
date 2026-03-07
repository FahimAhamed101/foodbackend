import { Cart } from '../models/cart.model';
import { Food } from '../models/food.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class CartService {
    /**
     * Get user's cart (create if doesn't exist)
     */
    async getCart(userId: string) {
        let cart = await Cart.findOne({ userId: new Types.ObjectId(userId) })
            .populate('items.foodId', 'title image baseRevenue finalPriceTag foodAvailability serviceFee providerId')
            .lean();

        if (!cart) {
            // Auto-create empty cart for user
            cart = await Cart.create({
                userId: new Types.ObjectId(userId),
                items: [],
                subtotal: 0,
            });
        }

        return cart;
    }

   
    async addToCart(userId: string, foodId: string, quantity: number) {
        const food = await Food.findById(foodId);
        if (!food) {
            throw new AppError('Food item not found', 404, 'FOOD_NOT_FOUND');
        }

        if (!food.foodAvailability || !food.foodStatus) {
            throw new AppError('This food item is currently unavailable', 400, 'FOOD_UNAVAILABLE');
        }

        // Find or create cart
        let cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

        if (!cart) {
            // Create new cart with item
            cart = await Cart.create({
                userId: new Types.ObjectId(userId),
                items: [
                    {
                        foodId: new Types.ObjectId(foodId),
                        quantity,
                        price: food.finalPriceTag,
                    },
                ],
            });
        } else {
            // Check if item already exists in cart
            const existingItemIndex = cart.items.findIndex(
                (item) => item.foodId.toString() === foodId
            );

            if (existingItemIndex !== -1) {
                // Increment quantity
                cart.items[existingItemIndex].quantity += quantity;
            } else {
                // Add new item
                cart.items.push({
                    foodId: new Types.ObjectId(foodId),
                    quantity,
                    price: food.finalPriceTag,
                });
            }

            await cart.save();
        }

        // Return populated cart
        return await Cart.findOne({ userId: new Types.ObjectId(userId) })
            .populate('items.foodId', 'title image baseRevenue finalPriceTag serviceFee providerId')
            .lean();
    }

    /**
     * Update item quantity (or remove if quantity = 0)
     */
    async updateCartItem(userId: string, foodId: string, quantity: number) {
        const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.foodId.toString() === foodId
        );

        if (itemIndex === -1) {
            throw new AppError('Item not found in cart', 404, 'ITEM_NOT_FOUND');
        }

        if (quantity === 0) {
            // Remove item
            cart.items.splice(itemIndex, 1);
        } else {
            // Update quantity
            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();

        return await Cart.findOne({ userId: new Types.ObjectId(userId) })
            .populate('items.foodId', 'title image baseRevenue finalPriceTag serviceFee providerId')
            .lean();
    }

    /**
     * Remove specific item from cart
     */
    async removeFromCart(userId: string, foodId: string) {
        const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        cart.items = cart.items.filter(
            (item) => item.foodId.toString() !== foodId
        );

        await cart.save();

        return await Cart.findOne({ userId: new Types.ObjectId(userId) })
            .populate('items.foodId', 'title image baseRevenue finalPriceTag serviceFee providerId')
            .lean();
    }

    /**
     * Clear entire cart
     */
    async clearCart(userId: string) {
        const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

        if (!cart) {
            throw new AppError('Cart not found', 404, 'CART_NOT_FOUND');
        }

        cart.items = [];
        await cart.save();

        return cart;
    }

    /**
     * Get cart item count
     */
    async getCartCount(userId: string) {
        const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });

        if (!cart) {
            return { count: 0, subtotal: 0 };
        }

        const count = cart.items.reduce((total, item) => total + item.quantity, 0);

        return {
            count,
            subtotal: cart.subtotal,
        };
    }
}

export default new CartService();
