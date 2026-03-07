import { Router } from 'express';
import cartController from '../controllers/cart.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import {
    addToCartSchema,
    updateCartItemSchema,
    removeFromCartSchema,
} from '../validations/cart.validation';
import rateLimit from 'express-rate-limit';

const router = Router();

const cartLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    limit: 200,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many cart requests, please try again later',
    },
});


router.use(authenticate as any);
router.use(cartLimiter);
router.get('/', cartController.getCart);
router.get('/count', cartController.getCartCount);
router.post('/add', validate(addToCartSchema), cartController.addToCart);
router.patch('/update', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/remove', validate(removeFromCartSchema), cartController.removeFromCart);
router.delete('/clear', cartController.clearCart);

export default router;
