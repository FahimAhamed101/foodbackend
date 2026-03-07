import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.preprocess((arg: any) => {
        const body = { ...arg };

        // Normalize coordinate keys (lat, lng, location[lat], location[lng])
        const rawLat = body.lat ?? body['location[lat]'];
        const rawLng = body.lng ?? body['location[lng]'];

        if (rawLat !== undefined || rawLng !== undefined) {
            body.location = {};

            // Aggressive cleaning: Remove everything except digits, dots, and minus signs
            const clean = (val: any) => {
                if (typeof val !== 'string') return val;
                const cleaned = val.trim().replace(/[^\d.-]/g, '');
                return cleaned === '' ? undefined : cleaned;
            };

            const processedLat = clean(rawLat);
            const processedLng = clean(rawLng);

            if (processedLat !== undefined) body.location.lat = processedLat;
            if (processedLng !== undefined) body.location.lng = processedLng;
        }

        // Clean up temporary flat keys
        delete body['location[lat]'];
        delete body['location[lng]'];
        delete body.lat;
        delete body.lng;

        if (Array.isArray(body.location)) delete body.location;

        // Handle cuisine parsing
        if (typeof body.cuisine === 'string') {
            try {
                body.cuisine = JSON.parse(body.cuisine);
            } catch {
                const trimmed = body.cuisine.trim();
                body.cuisine = trimmed ? [trimmed] : [];
            }
        }

        return body;
    }, z.object({
        profile: z.string().url('Profile must be a valid URL').optional(),
        restaurantName: z.string().trim().min(2).max(100).optional(),
        contactEmail: z.string().email('Invalid email format').optional(),
        phoneNumber: z.string().optional(),
        restaurantAddress: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        location: z.object({
            lat: z.preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().min(-90).max(90).optional()),
            lng: z.preprocess((val) => (val === undefined || val === '' ? undefined : Number(val)), z.number().min(-180).max(180).optional())
        }).optional(),
        cuisine: z.array(z.string()).optional(),
    })),
});
