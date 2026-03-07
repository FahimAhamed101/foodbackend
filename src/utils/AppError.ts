class AppError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    errorCode: string;

    constructor(message: string, statusCode: number, errorCode: string = 'INTERNAL_SERVER_ERROR') {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
