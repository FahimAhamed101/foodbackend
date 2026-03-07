import multer from 'multer';
import AppError from '../utils/AppError';
import cloudinaryConfig from '../config/cloudinary';
import { Request, RequestHandler, Response } from 'express';

type MutableMulterFile = Express.Multer.File & {
    path?: string;
    filename?: string;
};

type MulterFieldsMap = Record<string, Express.Multer.File[]>;

const fileFilter = (_req: Request, _file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    cb(null, true);
};

const multerUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

const runMulterMiddleware = (handler: RequestHandler, req: Request, res: Response): Promise<void> => {
    return new Promise((resolve, reject) => {
        handler(req, res, (err?: unknown) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

const mapUploadError = (error: unknown) => {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof multer.MulterError) {
        return new AppError(error.message, 400, 'UPLOAD_ERROR');
    }

    if (error instanceof Error) {
        return new AppError(error.message, 500, 'UPLOAD_ERROR');
    }

    return new AppError('File upload failed', 500, 'UPLOAD_ERROR');
};

const uploadFileToCloudinary = async (file: Express.Multer.File) => {
    const result = await cloudinaryConfig.uploadBufferToCloudinary(file.buffer, {
        folder: 'uploads',
        resource_type: 'auto'
    });

    const mutableFile = file as MutableMulterFile;
    mutableFile.path = result.secure_url;
    mutableFile.filename = result.public_id;
};

const single = (fieldName: string): RequestHandler => {
    return async (req, res, next) => {
        try {
            await runMulterMiddleware(multerUpload.single(fieldName), req, res);

            if (req.file) {
                await uploadFileToCloudinary(req.file);
            }

            next();
        } catch (error) {
            next(mapUploadError(error));
        }
    };
};

const fields = (fieldsConfig: multer.Field[]): RequestHandler => {
    return async (req, res, next) => {
        try {
            await runMulterMiddleware(multerUpload.fields(fieldsConfig), req, res);

            const filesMap = req.files as MulterFieldsMap | undefined;
            if (filesMap) {
                const uploadTasks: Promise<void>[] = [];

                for (const files of Object.values(filesMap)) {
                    for (const file of files) {
                        uploadTasks.push(uploadFileToCloudinary(file));
                    }
                }

                await Promise.all(uploadTasks);
            }

            next();
        } catch (error) {
            next(mapUploadError(error));
        }
    }
};

export const upload = { single, fields };
