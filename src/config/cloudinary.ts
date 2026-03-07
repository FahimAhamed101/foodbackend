import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadBufferToCloudinary = (
    buffer: Buffer,
    options: Record<string, unknown> = {}
) => {
    return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
            if (error || !result?.secure_url || !result?.public_id) {
                return reject(error || new Error('Cloudinary upload failed'));
            }
            resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
            });
        });

        uploadStream.end(buffer);
    });
};

export default { cloudinary, uploadBufferToCloudinary };
