import { z } from 'zod';

/**
 * Validation schema for nearby providers search
 */
export const nearbyProvidersSchema = z.object({
    body: z.object({
        latitude: z
            .number()
            .min(-90, 'Latitude must be between -90 and 90')
            .max(90, 'Latitude must be between -90 and 90'),
        
        longitude: z
            .number()
            .min(-180, 'Longitude must be between -180 and 180')
            .max(180, 'Longitude must be between -180 and 180'),
        
        radius: z
            .number()
            .positive('Radius must be a positive number')
            .max(100, 'Radius cannot exceed 100 km')
            .optional()
            .default(3), // Default 3 km radius
        
        page: z
            .number()
            .int()
            .positive()
            .optional()
            .default(1),
        
        limit: z
            .number()
            .int()
            .positive()
            .max(100, 'Limit cannot exceed 100')
            .optional()
            .default(20),
        
        cuisine: z
            .string()
            .optional(),
        
        sortBy: z
            .enum(['distance', 'rating', 'name'])
            .optional()
            .default('distance')
    })
});

export type NearbyProvidersInput = z.infer<typeof nearbyProvidersSchema>['body'];
