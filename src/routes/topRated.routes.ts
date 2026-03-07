import express from 'express';
import topRatedController from '../controllers/topRated.controller';
import { validate } from '../middlewares/validate';
import { getTopRestaurantsSchema, getTopFoodsSchema } from '../validations/topRated.validation';

const router = express.Router();

// Get top rated restaurants
router.get('/restaurants', validate(getTopRestaurantsSchema), topRatedController.getTopRestaurants);

// Get top rated foods
router.get('/foods', validate(getTopFoodsSchema), topRatedController.getTopFoods);

export default router;
