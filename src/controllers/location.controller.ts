import { Request, Response } from 'express';
import locationService from '../services/location.service';
import { catchAsync } from '../utils/catchAsync';
import AppError from '../utils/AppError';

class LocationController {
    /**
     * GET /api/v1/location/city?lat=37.7749&lng=-122.4194
     * 
     * Get city, state, country from latitude and longitude
     */
    getCityFromCoordinates = catchAsync(async (req: Request, res: Response) => {
        const { lat, lng } = req.query;

        // Validate query parameters
        if (!lat || !lng) {
            throw new AppError('Latitude and longitude are required', 400, 'MISSING_COORDINATES');
        }

        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);

        // Validate coordinate values
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new AppError('Invalid coordinates. Must be valid numbers', 400, 'INVALID_COORDINATES');
        }

        // Validate coordinate ranges
        locationService.validateCoordinates(latitude, longitude);

        // Get location data
        const locationData = await locationService.getCityFromCoordinates(latitude, longitude);

        res.status(200).json({
            success: true,
            data: locationData,
        });
    });
}

export default new LocationController();
