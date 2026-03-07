import express from 'express';
import rateLimit from 'express-rate-limit';
import profileController from '../controllers/profile.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';
import { updateProfileSchema } from '../validations/profile.validation';

const router = express.Router();

const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        errorCode: 'RATE_LIMIT_ERROR',
        message: 'Too many profile requests, please try again later',
    },
});

router.use(authenticate);
router.use(profileLimiter);

router.get(['/', '/me'], profileController.getProfile);
router.patch(['/', '/me'], upload.single('profilePic'), validate(updateProfileSchema), profileController.updateProfile);
router.put(['/', '/me'], upload.single('profilePic'), validate(updateProfileSchema), profileController.updateProfile);
router.delete(['/', '/me'], profileController.deleteProfile);

export default router;
