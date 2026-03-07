import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import AppError from '../utils/AppError';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed: any = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });

            if (parsed.body) Object.assign(req.body, parsed.body);
            if (parsed.query) Object.assign(req.query, parsed.query);
            if (parsed.params) Object.assign(req.params, parsed.params);

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.issues.map((i) => i.message).join(', ');
                const validationError = new AppError(message, 400, 'VALIDATION_ERROR');
                (validationError as any).details = error.issues;
                return next(validationError);
            }
            next(error);
        }
    };
};
