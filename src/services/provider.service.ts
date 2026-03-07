import { Order, OrderStatus } from '../models/order.model';
import { User, UserRole } from '../models/user.model';
import { ProviderProfile } from '../models/providerProfile.model';
import { Food } from '../models/food.model';
import { Category } from '../models/category.model';
import AppError from '../utils/AppError';
import { calculateDistance, isValidCoordinates } from '../utils/distance.utils';
import { Types } from 'mongoose';
import { NearbyProvidersInput } from '../validations/provider.validation';

interface ProviderWithDistance {
    providerId: string;
    restaurantName: string;
    location: {
        lat: number;
        lng: number;
    };
    distance: number;
    cuisine: string[];
    restaurantAddress: string;
    city: string;
    state: string;
    phoneNumber: string;
    contactEmail: string;
    profile: string;
    isVerify: boolean;
    verificationStatus: string;
    rating?: number;
    totalReviews?: number;
    availableFoods?: number;
}

class ProviderService {
    /**
     * Get nearby providers using Haversine formula
     */
    async getNearbyProviders(input: NearbyProvidersInput) {
        const { latitude, longitude, radius, page = 1, limit = 20, cuisine, sortBy = 'distance' } = input;

        // Validate coordinates
        if (!isValidCoordinates(latitude, longitude)) {
            throw new AppError('Invalid coordinates provided', 400, 'INVALID_COORDINATES');
        }

        // Build query for active and verified providers
        const query: any = {
            isActive: true,
            status: 'ACTIVE',
            verificationStatus: { $in: ['APPROVED', 'ACTIVE'] }, // Updated to allow both
            'location.lat': { $exists: true, $ne: null },
            'location.lng': { $exists: true, $ne: null }
        };

        // Filter by cuisine if provided
        if (cuisine) {
            // Find categories that match the cuisine name (case-insensitive)
            const matchingCategories = await Category.find({
                categoryName: { $regex: new RegExp(`^${cuisine}$`, 'i') }
            }).select('providerId').lean();

            const providerIdsWithCategory = matchingCategories.map(c => c.providerId);

            query.$or = [
                { cuisine: { $in: [new RegExp(`^${cuisine}$`, 'i')] } },
                { providerId: { $in: providerIdsWithCategory } }
            ];
        }

        // Fetch all providers (we'll filter by distance in memory)
        // For production with large datasets, use MongoDB geospatial queries
        const providers = await ProviderProfile.find(query)
            .select('providerId restaurantName location cuisine restaurantAddress city state phoneNumber contactEmail profile isVerify verificationStatus')
            .lean();

        if (providers.length === 0) {
            return {
                providers: [],
                pagination: {
                    total: 0,
                    page,
                    limit,
                    totalPages: 0
                }
            };
        }

        // Calculate distance for each provider and filter by radius
        const providersWithDistance: ProviderWithDistance[] = [];

        for (const provider of providers) {
            // Skip providers without valid location
            if (!provider.location?.lat || !provider.location?.lng) {
                continue;
            }

            const distance = calculateDistance(
                { lat: latitude, lng: longitude },
                { lat: provider.location.lat, lng: provider.location.lng }
            );

            // Only include providers within radius
            if (distance <= radius) {
                // Get food count for this provider
                const foodCount = await Food.countDocuments({
                    providerId: provider.providerId,
                    foodStatus: true
                });

                providersWithDistance.push({
                    providerId: provider.providerId.toString(),
                    restaurantName: provider.restaurantName,
                    location: {
                        lat: provider.location.lat,
                        lng: provider.location.lng
                    },
                    distance,
                    cuisine: provider.cuisine || [],
                    restaurantAddress: provider.restaurantAddress,
                    city: provider.city,
                    state: provider.state,
                    phoneNumber: provider.phoneNumber,
                    contactEmail: provider.contactEmail,
                    profile: provider.profile,
                    isVerify: provider.isVerify,
                    verificationStatus: provider.verificationStatus,
                    availableFoods: foodCount
                });
            }
        }

        // Sort providers
        if (sortBy === 'distance') {
            providersWithDistance.sort((a, b) => a.distance - b.distance);
        } else if (sortBy === 'name') {
            providersWithDistance.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName));
        }

        // Pagination
        const total = providersWithDistance.length;
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;
        const paginatedProviders = providersWithDistance.slice(skip, skip + limit);

        return {
            providers: paginatedProviders,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        };
    }
    async getCustomerDetails(providerId: string, customerId: string) {
        const pId = new Types.ObjectId(providerId);
        const cId = new Types.ObjectId(customerId);

        const orderExists = await Order.exists({ providerId: pId, customerId: cId });
        if (!orderExists) {
            throw new AppError(
                'You can only view details of customers who have ordered from you',
                403,
                'CUSTOMER_ACCESS_ERROR'
            );
        }

        const customer = await User.findById(cId).select('fullName email phone profilePic');
        if (!customer) {
            throw new AppError('Customer not found', 404, 'CUSTOMER_NOT_FOUND_ERROR');
        }

        const itemsAggregation = await Order.aggregate([
            { $match: { providerId: pId, customerId: cId } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'items.foodId',
                    foreignField: '_id',
                    as: 'foodDetails',
                },
            },
            { $unwind: '$foodDetails' },
            {
                $group: {
                    _id: '$items.foodId',
                    foodName: { $first: '$foodDetails.title' },
                    image: { $first: '$foodDetails.image' },
                    quantity: { $sum: '$items.quantity' },
                    totalPrice: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                },
            },
            {
                $project: {
                    _id: 0,
                    image: 1,
                    foodName: 1,
                    quantity: 1,
                    totalPrice: 1,
                },
            },
        ]);

        const subTotal = itemsAggregation.reduce((sum, item) => sum + item.totalPrice, 0);
        const estimatedTax = Number((subTotal * 0.1).toFixed(2)); // 10% tax

        const serviceFeeAggregation = await Order.aggregate([
            { $match: { providerId: pId, customerId: cId } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'foods',
                    localField: 'items.foodId',
                    foreignField: '_id',
                    as: 'foodDetails',
                },
            },
            { $unwind: '$foodDetails' },
            {
                $group: {
                    _id: null,
                    totalServiceFee: { $sum: { $multiply: ['$items.quantity', '$foodDetails.serviceFee'] } }
                }
            }
        ]);

        const totalServiceFee = serviceFeeAggregation[0]?.totalServiceFee || 0;
        const grandTotal = subTotal + estimatedTax + totalServiceFee;

        const orders = await Order.find({ providerId: pId, customerId: cId })
            .sort({ createdAt: -1 })
            .select('status')
            .limit(2);

        const currentStatus = orders[0]?.status || 'Unknown';
        const previousStatus = orders[1]?.status || 'None';

        let nextStatus = 'None';
        switch (currentStatus) {
            case OrderStatus.PENDING:
                nextStatus = OrderStatus.PREPARING;
                break;
            case OrderStatus.PREPARING:
                nextStatus = OrderStatus.READY_FOR_PICKUP;
                break;
            case OrderStatus.READY_FOR_PICKUP:
                nextStatus = OrderStatus.PICKED_UP;
                break;
            default:
                nextStatus = 'None';
        }

        return {
            productsDetail: {
                items: itemsAggregation,
                subTotal: Number(subTotal.toFixed(2)),
                estimatedTax,
                serviceFee: Number(totalServiceFee.toFixed(2)),
                grandTotal: Number(grandTotal.toFixed(2)),
            },
            orderStatus: {
                previousStatus,
                currentStatus,
                nextStatus,
            },
            customerInfo: {
                profilePic: customer.profilePic,
                customerName: customer.fullName,
                email: customer.email,
                phone: customer.phone,
            },
        };
    }

    async getReadyOrders(providerId: string, page: number = 1, limit: number = 10) {
        const pId = new Types.ObjectId(providerId);
        const skip = (page - 1) * limit;

        const [orders, total] = await Promise.all([
            Order.find({
                providerId: pId,
                status: OrderStatus.READY_FOR_PICKUP
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('customerId', 'fullName email phone profilePic')
                .populate('items.foodId', 'title image'),

            Order.countDocuments({
                providerId: pId,
                status: OrderStatus.READY_FOR_PICKUP
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        const formattedOrders = orders.map(order => {
            const customer = order.customerId as any;
            return {
                orderId: order.orderId,
                status: order.status,
                createdAt: order.createdAt,
                customer: {
                    id: customer?._id,
                    name: customer?.fullName || 'Unknown',
                    phone: customer?.phone,
                    profilePic: customer?.profilePic
                },
                items: order.items.map((item: any) => ({
                    name: item.foodId?.title || 'Unknown Item',
                    image: item.foodId?.image,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: order.totalPrice,
                paymentMethod: order.paymentMethod,
                pickupTime: order.pickupTime
            };
        });

        return {
            orders: formattedOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }

    async getOrders(providerId: string, page: number = 1, limit: number = 10, status: string = 'all') {
        const pId = new Types.ObjectId(providerId);
        const skip = (page - 1) * limit;

        const query: any = { providerId: pId };

        // Filter by status if provided and not 'all'
        if (status && status !== 'all') {
            query.status = status;
        }

        const [orders, total] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('customerId', 'fullName email phone profilePic')
                .populate('items.foodId', 'title image'),

            Order.countDocuments(query)
        ]);

        const totalPages = Math.ceil(total / limit);

        const formattedOrders = orders.map(order => {
            const customer = order.customerId as any;
            return {
                orderId: order.orderId,
                status: order.status,
                createdAt: order.createdAt,
                customer: {
                    id: customer?._id,
                    name: customer?.fullName || 'Unknown',
                    phone: customer?.phone,
                    profilePic: customer?.profilePic
                },
                items: order.items.map((item: any) => ({
                    name: item.foodId?.title || 'Unknown Item',
                    image: item.foodId?.image,
                    quantity: item.quantity,
                    price: item.price
                })),
                totalAmount: order.totalPrice,
                paymentMethod: order.paymentMethod,
                pickupTime: order.pickupTime
            };
        });

        return {
            orders: formattedOrders,
            pagination: {
                total,
                page,
                limit,
                totalPages
            }
        };
    }
}

export default new ProviderService();
