import { Router } from 'express';
import locationController from '../controllers/location.controller';

const router = Router();

/**
 * Public Route - No authentication required
 * Get city, state, country from coordinates
 */
router.get('/city', locationController.getCityFromCoordinates);

export default router;
