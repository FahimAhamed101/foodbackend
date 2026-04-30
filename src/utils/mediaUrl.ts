import { Request } from 'express';

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;

const readForwardedHeader = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) {
        return value[0]?.split(',')[0]?.trim() || '';
    }

    return value?.split(',')[0]?.trim() || '';
};

const normalizeCloudinaryUrl = (value: string): string =>
    value.replace(/^http:\/\/res\.cloudinary\.com\//i, 'https://res.cloudinary.com/');

export const getRequestBaseUrl = (req: Request): string => {
    const forwardedProto = readForwardedHeader(req.headers['x-forwarded-proto']);
    const forwardedHost = readForwardedHeader(req.headers['x-forwarded-host']);
    const protocol = forwardedProto || req.protocol || 'http';
    const host = forwardedHost || req.get('host') || '';

    return host ? `${protocol}://${host}` : '';
};

export const toPublicMediaUrl = (value: unknown, baseUrl = ''): string => {
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    if (!trimmed) return '';

    if (trimmed.startsWith('data:')) {
        return trimmed;
    }

    if (trimmed.startsWith('//')) {
        return `https:${trimmed}`;
    }

    const normalized = trimmed.replace(/\\/g, '/');

    if (ABSOLUTE_URL_PATTERN.test(normalized)) {
        return normalizeCloudinaryUrl(normalized);
    }

    if (/^res\.cloudinary\.com\//i.test(normalized)) {
        return `https://${normalized}`;
    }

    if (/^\/?uploads\//i.test(normalized) && process.env.CLOUDINARY_CLOUD_NAME) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME.trim();
        const publicId = normalized.replace(/^\/+/, '');
        return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
    }

    const pathname = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return baseUrl ? `${baseUrl}${pathname}` : pathname;
};
