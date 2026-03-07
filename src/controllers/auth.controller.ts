import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';
import { AuthRequest } from '../middlewares/authenticate';

class AuthController {
    signup = catchAsync(async (req: Request, res: Response) => {
        const result = await authService.signup(req.body);
        res.status(201).json({
            success: true,
            data: result,
        });
    });

    providerSignup = catchAsync(async (req: Request, res: Response) => {
        const result = await authService.providerSignup(req.body);
        res.status(201).json({
            success: true,
            data: result,
        });
    });

    verifyEmail = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await authService.verifyEmail(email, otp);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    resendVerification = catchAsync(async (req: Request, res: Response) => {
        const { email } = req.body;
        const result = await authService.resendVerification(email);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    login = catchAsync(async (req: Request, res: Response) => {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    logout = catchAsync(async (req: AuthRequest, res: Response) => {
        const token = req.token;
        if (!token) {
            throw new Error('Already logged out or no token provided');
        }
        const result = await authService.logout(token);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    forgotPassword = catchAsync(async (req: Request, res: Response) => {
        const { email } = req.body;
        const result = await authService.forgotPassword(email);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    verifyForgotOtp = catchAsync(async (req: Request, res: Response) => {
        const { email, otp } = req.body;
        const result = await authService.verifyForgotOtp(email, otp);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    resetPassword = catchAsync(async (req: AuthRequest, res: Response) => {
        const { newPassword } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            throw new Error('Authentication required');
        }

        const result = await authService.resetPassword(userId, newPassword);
        res.status(200).json({
            success: true,
            data: result,
        });
    });

    changePassword = catchAsync(async (req: AuthRequest, res: Response) => {
        const userId = req.user?.userId;
        if (!userId) {
            throw new Error('Authentication required');
        }

        const result = await authService.changePassword(userId, req.body);
        res.status(200).json({
            success: true,
            ...result
        });
    });
}

export default new AuthController();
