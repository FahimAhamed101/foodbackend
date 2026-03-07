import express from 'express';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/authenticate';
import {
    signupSchema,
    providerSignupSchema,
    loginSchema,
    verifyEmailSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    verifyForgotOtpSchema,
    resendVerificationSchema,
    changePasswordSchema
} from '../validations/auth.validation';

const router = express.Router();



const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Increased for development (change to 10 in production)
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

router.use(authLimiter);

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/provider/signup', validate(providerSignupSchema), authController.providerSignup);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/verify-forgot-otp', validate(verifyForgotOtpSchema), authController.verifyForgotOtp);
router.post('/reset-password', authenticate, validate(resetPasswordSchema), authController.resetPassword);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
