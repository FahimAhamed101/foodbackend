import cloudinaryConfig from '../config/cloudinary';
import express, { Request, Response } from 'express';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});


router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinaryConfig.cloudinary.uploader.upload_stream(
                { folder: 'uploads', resource_type: 'auto' },
                (error: any, result: any) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file!.buffer);
        });
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

export default router;