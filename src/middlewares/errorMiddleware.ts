import { Request, Response, NextFunction } from 'express';

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            errorCode: err.errorCode,
            message: err.message,
            status: err.status,
            details: err.details,
            stack: err.stack,
            error: err,
        });
    } else {
        if (err.isOperational) {
            res.status(err.statusCode).json({
                success: false,
                errorCode: err.errorCode,
                message: err.message,
                details: err.details,
            });
        } else {
            console.error('ERROR ', err);
            res.status(500).json({
                success: false,
                errorCode: 'INTERNAL_SERVER_ERROR',
                message: 'Something went very wrong!',
            });
        }
    }
};

export default globalErrorHandler;
