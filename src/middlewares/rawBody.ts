import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to capture raw body for Stripe webhook signature verification
 * This must be applied BEFORE express.json() middleware
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl === '/api/v1/stripe/webhook') {
        let data = '';
        req.setEncoding('utf8');

        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            req.body = data;
            next();
        });
    } else {
        next();
    }
};
