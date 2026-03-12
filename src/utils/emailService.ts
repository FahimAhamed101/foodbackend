import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import config from '../config';
import AppError from './AppError';

interface EmailOptions {
    email: string;
    subject: string;
    message: string;
    html?: string;
}

const extractOtp = (message: string): string | null => {
    const explicitMatch = message.match(/verification\s*code\s*is[:\s]+(\d{4,8})/i);
    if (explicitMatch?.[1]) return explicitMatch[1];

    const genericMatch = message.match(/\b(\d{6})\b/);
    if (genericMatch?.[1]) return genericMatch[1];

    return null;
};

const logDevOtpIfPresent = (options: EmailOptions, context: string) => {
    if (config.env === 'production') return;

    const otp = extractOtp(options.message || '');
    if (!otp) return;

    console.log(`[DEV][OTP][${context}] email=${options.email} otp=${otp}`);
};

const renderMockEmail = (options: EmailOptions) => {
    console.log('-----------------------------------------');
    console.log('Email [DEVELOPMENT MODE] Mock:');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message}`);
    if (options.html) console.log('HTML:    [Rich Content Provided]');
    logDevOtpIfPresent(options, 'MOCK');
    console.log('-----------------------------------------');
};

const sendViaResend = async (options: EmailOptions) => {
    const client = new Resend(config.resend.apiKey);

    const { error } = await client.emails.send({
        from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
        to: [options.email],
        subject: options.subject,
        text: options.message,
        html: options.html,
    });

    if (error) {
        throw new AppError(error.message || 'Failed to send email via Resend', 502, 'EMAIL_DELIVERY_FAILED');
    }
};

const sendViaSmtp = async (options: EmailOptions) => {
    const transporterOptions: any = {
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        requireTLS: config.email.requireTLS,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
    };

    const transporter = nodemailer.createTransport(transporterOptions);

    await transporter.sendMail({
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    });
};

export const sendEmail = async (options: EmailOptions) => {
    console.log(`[DEBUG] Attempting to send email to: ${options.email} with subject: ${options.subject}`);

    const hasResendConfig = Boolean(config.resend.apiKey && config.resend.fromEmail);
    const hasSmtpConfig = Boolean(config.email.host && config.email.user && config.email.pass);

    // For local development, allow OTP flow to continue even if no provider is configured.
    if (!hasResendConfig && !hasSmtpConfig && config.env !== 'production') {
        renderMockEmail(options);
        return;
    }

    if (!hasResendConfig && !hasSmtpConfig && config.env === 'production') {
        throw new AppError(
            'Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL (or SMTP settings).',
            500,
            'EMAIL_CONFIG_MISSING'
        );
    }

    // Prefer Resend, fallback to SMTP if both are configured.
    try {
        if (hasResendConfig) {
            await sendViaResend(options);
            console.log(`Email sent to ${options.email} via Resend`);
            logDevOtpIfPresent(options, 'RESEND_SUCCESS');
            return;
        }

        await sendViaSmtp(options);
        console.log(`Email sent to ${options.email} via SMTP`);
        logDevOtpIfPresent(options, 'SMTP_SUCCESS');
    } catch (error) {
        console.error('Primary email provider failed:', error);

        if (hasResendConfig && hasSmtpConfig) {
            try {
                await sendViaSmtp(options);
                console.log(`Email sent to ${options.email} via SMTP fallback`);
                logDevOtpIfPresent(options, 'SMTP_FALLBACK_SUCCESS');
                return;
            } catch (smtpError) {
                console.error('SMTP fallback failed:', smtpError);
            }
        }

        if (config.env === 'production') {
            throw new AppError('Failed to send OTP email. Please try again later.', 502, 'EMAIL_DELIVERY_FAILED');
        }

        console.log('[DEV ERROR] Email provider failed but continuing because of development mode.');
        renderMockEmail(options);
        logDevOtpIfPresent(options, 'DELIVERY_FAILED_DEV_FALLBACK');
    }
};
