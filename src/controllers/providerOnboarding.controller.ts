import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authenticate';
import providerOnboardingService from '../services/providerOnboarding.service';
import { catchAsync } from '../utils/catchAsync';

// ──────────────────────────────────────────────────────────
// STEP 1: Register Email & Send OTP
// POST /api/v1/auth/provider/register-email
// ──────────────────────────────────────────────────────────
export const registerEmail = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const result = await providerOnboardingService.registerEmail(email);
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 2: Verify Email OTP
// POST /api/v1/auth/provider/verify-email-otp
// ──────────────────────────────────────────────────────────
export const verifyEmailOtp = catchAsync(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const result = await providerOnboardingService.verifyEmailOtp(email, otp);
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 3: Set Password
// POST /api/v1/auth/provider/set-password
// ──────────────────────────────────────────────────────────
export const setPassword = catchAsync(async (req: AuthRequest, res: Response) => {
    const { password, confirmPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'Password and confirmPassword are required' });
    }

    // Strong password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters, with uppercase, lowercase, number, and special character',
        });
    }

    const result = await providerOnboardingService.setPassword(userId, password, confirmPassword);
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 4: Submit Restaurant Information
// POST /api/v1/provider/onboarding/restaurant-info
// ──────────────────────────────────────────────────────────
export const submitRestaurantInfo = catchAsync(async (req: AuthRequest, res: Response) => {
    const providerId = req.user?.userId;
    if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const restaurantImageUrl = req.file ? req.file.path : undefined;
    const result = await providerOnboardingService.submitRestaurantInfo(providerId, req.body, restaurantImageUrl);
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 5: Upload Required Documents
// POST /api/v1/provider/onboarding/documents
// ──────────────────────────────────────────────────────────
export const uploadDocuments = catchAsync(async (req: AuthRequest, res: Response) => {
    const providerId = req.user?.userId;
    if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const result = await providerOnboardingService.uploadDocuments(providerId, req.body, files || {});
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 6A: Admin - Get Pending Providers
// GET /api/v1/admin/providers/pending
// ──────────────────────────────────────────────────────────
export const getPendingProviders = catchAsync(async (req: AuthRequest, res: Response) => {
    const result = await providerOnboardingService.getPendingProviders(req.query);
    res.status(200).json({ success: true, data: result });
});

// ──────────────────────────────────────────────────────────
// STEP 6B: Admin - Get Provider Verification Details
// GET /api/v1/admin/providers/:providerId/verification-details
// ──────────────────────────────────────────────────────────
export const getProviderVerificationDetails = catchAsync(async (req: AuthRequest, res: Response) => {
    const providerId = req.params.providerId as string;
    const result = await providerOnboardingService.getProviderVerificationDetails(providerId);
    res.status(200).json({ success: true, data: result });
});

// ──────────────────────────────────────────────────────────
// STEP 6C/D: Admin - Approve or Reject Provider
// PATCH /api/v1/admin/providers/:providerId/verify
// ──────────────────────────────────────────────────────────
export const verifyProvider = catchAsync(async (req: AuthRequest, res: Response) => {
    const providerId = req.params.providerId as string;
    const adminId = req.user?.userId;
    const { action, rejectionReason, adminNotes } = req.body;

    if (!adminId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!action) {
        return res.status(400).json({ success: false, message: 'Action is required (approve or reject)' });
    }

    const result = await providerOnboardingService.verifyProvider(
        providerId, adminId, action, rejectionReason, adminNotes
    );
    res.status(200).json({ success: true, ...result });
});

// ──────────────────────────────────────────────────────────
// STEP 7: Get Onboarding Status
// GET /api/v1/provider/onboarding/status
// ──────────────────────────────────────────────────────────
export const getOnboardingStatus = catchAsync(async (req: AuthRequest, res: Response) => {
    const providerId = req.user?.userId;
    if (!providerId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const result = await providerOnboardingService.getOnboardingStatus(providerId);
    res.status(200).json({ success: true, data: result });
});
