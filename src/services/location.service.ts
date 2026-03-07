import axios from 'axios';
import AppError from '../utils/AppError';

interface LocationData {
    city: string;
    state: string;
    country: string;
    county?: string;
    zipCode?: string;
}

class LocationService {
    private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

    /**
     * Get city, state, country from latitude and longitude
     * Uses OpenStreetMap Nominatim API (free, no API key required)
     */
    async getCityFromCoordinates(lat: number, lng: number): Promise<LocationData> {
        try {
            const response = await axios.get(this.NOMINATIM_URL, {
                params: {
                    lat,
                    lon: lng,
                    format: 'json',
                    addressdetails: 1,
                },
                headers: {
                    'User-Agent': 'EMDR-Food-Delivery-App/1.0', // Required by Nominatim
                },
                timeout: 5000, // 5 second timeout
            });

            const address = response.data.address;

            if (!address) {
                throw new AppError('Unable to determine location from coordinates', 404, 'LOCATION_NOT_FOUND');
            }

            // Extract city (can be city, town, village, or municipality)
            const city = address.city || 
                        address.town || 
                        address.village || 
                        address.municipality || 
                        address.county ||
                        'Unknown';

            // Extract state (can be state, province, or region)
            const state = address.state || 
                         address.province || 
                         address.region || 
                         'Unknown';

            // Extract country
            const country = address.country || 'Unknown';

            // Extract additional info
            const county = address.county || undefined;
            const zipCode = address.postcode || undefined;

            return {
                city,
                state,
                country,
                county,
                zipCode,
            };

        } catch (error: any) {
            if (error instanceof AppError) {
                throw error;
            }

            if (error.code === 'ECONNABORTED') {
                throw new AppError('Location service timeout', 504, 'LOCATION_TIMEOUT');
            }

            if (error.response?.status === 429) {
                throw new AppError('Too many location requests. Please try again later', 429, 'RATE_LIMIT');
            }

            throw new AppError(
                'Failed to get location from coordinates',
                500,
                'LOCATION_SERVICE_ERROR'
            );
        }
    }

    /**
     * Validate coordinates
     */
    validateCoordinates(lat: number, lng: number): void {
        if (lat < -90 || lat > 90) {
            throw new AppError('Invalid latitude. Must be between -90 and 90', 400, 'INVALID_LATITUDE');
        }

        if (lng < -180 || lng > 180) {
            throw new AppError('Invalid longitude. Must be between -180 and 180', 400, 'INVALID_LONGITUDE');
        }
    }
}

export default new LocationService();
