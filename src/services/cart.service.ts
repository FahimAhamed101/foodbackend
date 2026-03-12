import { Cart } from '../models/cart.model';
import { Food } from '../models/food.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Types } from 'mongoose';
import AppError from '../utils/AppError';

class CartService {
    private roundMoney(value: number): number {
        return Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0;
    }

    private normalizeRate(value: unknown): number {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        return numeric > 1 ? numeric / 100 : numeric;
    }

    private extractProviderId(cart: any): Types.ObjectId | null {
        const firstItem = Array.isArray(cart?.items) ? cart.items[0] : null;
        const rawProviderId = firstItem?.foodId?.providerId;

        if (!rawProviderId) return null;

        try {
            if (rawProviderId instanceof Types.ObjectId) return rawProviderId;
            return new Types.ObjectId(String(rawProviderId));
        } catch {
            return null;
        }
    }

    private async getPopulatedCart(userId: string) {
        return await Cart.findOne({ userId: new Types.ObjectId(userId) })
            .populate('items.foodId', 'title image baseRevenue finalPriceTag foodAvailability foodStatus serviceFee providerId')
            .lean();
    }

    private async enrichCart(cart: any) {
        if (!cart) return cart;

        const items = Array.isArray(cart.items) ? cart.items : [];
        const subtotalRaw =
            typeof cart.subtotal === 'number'
                ? cart.subtotal
                : items.reduce((sum: number, item: any) => {
                    const price = Number(item?.price) || 0;
                    const quantity = Number(item?.quantity) || 0;
                    return sum + (price * quantity);
                }, 0);

        const subtotal = this.roundMoney(subtotalRaw);

        const providerId = this.extractProviderId(cart);
        const providerProfile = providerId
            ? await ProviderProfile.findOne({ providerId })
                .select('restaurantName restaurantAddress profile cityTax')
                .lean()
            : null;

        // Use provider cityTax for both state and county tax rows in cart breakdown.
        const cityTaxRate = this.normalizeRate(providerProfile?.cityTax);
        const stateTaxRate = cityTaxRate;
        const countyTaxRate = cityTaxRate;

        const stateTaxAmount = this.roundMoney(subtotal * stateTaxRate);
        const countyTaxAmount = this.roundMoney(subtotal * countyTaxRate);

        const platformFee = this.roundMoney(typeof cart?.platformFee === 'number' ? cart.platformFee : 0);
        const total = this.roundMoney(subtotal + platformFee + stateTaxAmount + countyTaxAmount);

        return {
            ...cart,
            subtotal,
            platformFee,
            cityTax: this.roundMoney(cityTaxRate * 100),
            cityTaxRate,
            stateTaxRate,
            countyTaxRate,
            stateTaxAmount,
            countyTaxAmount,
            total,
            restaurantName: providerProfile?.restaurantName || cart?.restaurantName || '',
            restaurantAddress: providerProfile?.restaurantAddress || cart?.restaurantAddress || '',
            restaurantProfile: providerProfile?.profile || cart?.restaurantProfile || '',
        };
    }

    /**
     * Get user's cart (create if doesn't exist)
     */
    async getCart(userId: string) {
        let cart = await this.getPopulatedCart(userId);

        if (!cart) {
            await Cart.create({
                userId: new Types.ObjectId(userId),
                items: [],
                subtotal: 0,
            });

            cart = await this.getPopulatedCart(userId);
        }

        return await this.enrichCart(cart);
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

        return await this.enrichCart(await this.getPopulatedCart(userId));
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

        return await this.enrichCart(await this.getPopulatedCart(userId));
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

        return await this.enrichCart(await this.getPopulatedCart(userId));
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

        return await this.enrichCart(await this.getPopulatedCart(userId));
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
