import express from 'express';
import { authenticate } from '../middlewares/authenticate';
import { requireRole } from '../middlewares/requireRole';
import { upload } from '../middlewares/upload';
import { UserRole } from '../models/user.model';
import {
    registerEmail,
    verifyEmailOtp,
    setPassword,
    submitRestaurantInfo,
    uploadDocuments,
    getPendingProviders,
    getProviderVerificationDetails,
    verifyProvider,
    getOnboardingStatus,
} from '../controllers/providerOnboarding.controller';

const router = express.Router();

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// ═══════════════════════════════════════════════════════════

// Step 1: Register Email & Send OTP
router.post('/auth/provider/register-email', registerEmail);

// Step 2: Verify Email OTP
router.post('/auth/provider/verify-email-otp', verifyEmailOtp);

// ═══════════════════════════════════════════════════════════
// PROVIDER ROUTES (Auth required)
// ═══════════════════════════════════════════════════════════

// Step 3: Set Password (needs temp token from Step 2)
router.post('/auth/provider/set-password', authenticate, setPassword);

// Step 4: Submit Restaurant Info  (with image upload)
router.post(
    '/provider/onboarding/restaurant-info',
    authenticate,
    requireRole([UserRole.PROVIDER]),
    upload.single('restturanImage'),
    submitRestaurantInfo
);

// Step 5: Upload Required Documents (multiple files)
router.post(
    '/provider/onboarding/documents',
    authenticate,
    requireRole([UserRole.PROVIDER]),
    upload.fields([
        { name: 'businessLicenseFile', maxCount: 1 },
        { name: 'healthPermitFile', maxCount: 1 },
        { name: 'stateOrCityLicenseFile', maxCount: 1 },
        { name: 'proofOfAddressFile', maxCount: 1 },
        { name: 'ownerGovernmentID', maxCount: 1 },
    ]),
    uploadDocuments
);

// Step 7: Check Onboarding Status
router.get(
    '/provider/onboarding/status',
    authenticate,
    requireRole([UserRole.PROVIDER]),
    getOnboardingStatus
);

// ═══════════════════════════════════════════════════════════
// ADMIN ROUTES (Admin auth required)
// ═══════════════════════════════════════════════════════════

// Step 6A: Get pending providers list
router.get(
    '/admin/providers/pending',
    authenticate,
    requireRole([UserRole.ADMIN]),
    getPendingProviders
);

// Step 6B: Get provider verification details
router.get(
    '/admin/providers/:providerId/verification-details',
    authenticate,
    requireRole([UserRole.ADMIN]),
    getProviderVerificationDetails
);

// Step 6C/D: Approve or Reject provider
router.patch(
    '/admin/providers/:providerId/verify',
    authenticate,
    requireRole([UserRole.ADMIN]),
    verifyProvider
);

export default router;
