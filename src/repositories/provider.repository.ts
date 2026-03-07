import { ProviderProfile } from '../models/providerProfile.model';
import { Coordinates } from '../utils/distance.utils';

/**
 * Provider Repository - Advanced queries for provider data
 */
class ProviderRepository {
    /**
     * Find nearby providers using MongoDB geospatial query
     * NOTE: Requires 2dsphere index on location field
     * Run: db.providerprofiles.createIndex({ location: "2dsphere" })
     */
    async findNearbyWithGeospatial(
        coordinates: Coordinates,
        radiusKm: number,
        options: {
            cuisine?: string;
            limit?: number;
            skip?: number;
        } = {}
    ) {
        const { cuisine, limit = 20, skip = 0 } = options;

        const query: any = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [coordinates.lng, coordinates.lat] // [longitude, latitude]
                    },
                    $maxDistance: radiusKm * 1000 // Convert km to meters
                }
            },
            isActive: true,
            status: 'ACTIVE',
            verificationStatus: 'APPROVED'
        };

        if (cuisine) {
            query.cuisine = { $in: [cuisine] };
        }

        return await ProviderProfile.find(query)
            .select('providerId restaurantName location cuisine restaurantAddress city state phoneNumber contactEmail profile isVerify verificationStatus')
            .skip(skip)
            .limit(limit)
            .lean();
    }

    /**
     * Find providers within a bounding box (alternative to radius search)
     */
    async findWithinBounds(
        minLat: number,
        maxLat: number,
        minLng: number,
        maxLng: number
    ) {
        return await ProviderProfile.find({
            'location.lat': { $gte: minLat, $lte: maxLat },
            'location.lng': { $gte: minLng, $lte: maxLng },
            isActive: true,
            status: 'ACTIVE',
            verificationStatus: 'APPROVED'
        }).lean();
    }

    /**
     * Get all active providers with valid locations
     */
    async findAllWithLocation(cuisine?: string) {
        const query: any = {
            isActive: true,
            status: 'ACTIVE',
            verificationStatus: 'APPROVED',
            'location.lat': { $exists: true, $ne: null },
            'location.lng': { $exists: true, $ne: null }
        };

        if (cuisine) {
            query.cuisine = { $in: [cuisine] };
        }

        return await ProviderProfile.find(query)
            .select('providerId restaurantName location cuisine restaurantAddress city state phoneNumber contactEmail profile isVerify verificationStatus')
            .lean();
    }
}

export default new ProviderRepository();
