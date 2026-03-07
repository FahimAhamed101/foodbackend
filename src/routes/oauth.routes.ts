import { Router } from 'express';
import oauthController from '../controllers/oauth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { googleAuthValidation, stepUpValidation, refreshTokenValidation } from '../validations/oauth.validation';

const router = Router();

/**
 * Public Routes (No authentication required)
 */

// Google OAuth authentication
router.post('/google', validate(googleAuthValidation), oauthController.googleAuth);

// Verify step-up OTP
router.post('/google/verify-stepup', validate(stepUpValidation), oauthController.verifyStepUp);

// Refresh access token
router.post('/refresh', validate(refreshTokenValidation), oauthController.refreshToken);

/**
 * Protected Routes (Authentication required)
 */

// Get all active sessions
router.get('/sessions', authenticate, oauthController.getSessions);

// Revoke specific session
router.delete('/sessions/:sessionId', authenticate, oauthController.revokeSession);

// Revoke all sessions (global logout)
router.delete('/sessions', authenticate, oauthController.revokeAllSessions);

export default router;
