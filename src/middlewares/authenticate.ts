import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import AppError from '../utils/AppError';
import { User } from '../models/user.model';
import { BlacklistedToken } from '../models/blacklistedToken.model';

export interface AuthRequest extends Request {
    token?: string;
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token: string | undefined;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401, 'AUTH_ERROR'));
        }

        const isBlacklisted = await BlacklistedToken.findOne({ token });
        if (isBlacklisted) {
            return next(new AppError('This token is no longer valid. Please log in again.', 401, 'AUTH_ERROR'));
        }


        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-key') as { userId: string; role: string };


        const user = await User.findById(decoded.userId);
        if (!user) {
            return next(new AppError('The user belonging to this token no longer exists.', 401, 'AUTH_ERROR'));
        }

        req.token = token;
        req.user = {
            userId: user._id.toString(),
            role: user.role,
        };

        next();
    } catch (err) {
        next(new AppError('Invalid token. Please log in again!', 401, 'AUTH_ERROR'));
    }
};
