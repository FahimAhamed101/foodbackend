import nodemailer from 'nodemailer';
import config from '../config';

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

export const sendEmail = async (options: EmailOptions) => {
    console.log(`[DEBUG] Attempting to send email to: ${options.email} with subject: ${options.subject}`);

    if (
        config.env === 'development' &&
        (config.email.user === 'your_smtp_user' || !config.email.user)
    ) {
        console.log('-----------------------------------------');
        console.log('Email [DEVELOPMENT MODE] Mock:');
        console.log(`To:      ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        if (options.html) console.log('HTML:    [Rich Content Provided]');
        logDevOtpIfPresent(options, 'MOCK');
        console.log('-----------------------------------------');
        return;
    }

    const transporterOptions: any = {
        host: config.email.host,
        port: config.email.port,
        auth: {
            user: config.email.user,
            pass: config.email.pass,
        },
    };

    // Use service: 'gmail' if host is gmail for better reliability
    if (config.email.host.includes('gmail.com')) {
        transporterOptions.service = 'gmail';
        delete transporterOptions.host;
        delete transporterOptions.port;
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    const mailOptions = {
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${options.email}`);
        logDevOtpIfPresent(options, 'SMTP_SUCCESS');
    } catch (error) {
        console.error('Email sending failed:', error);
        if (config.env === 'production') {
            throw new Error('Email could not be sent. Please try again later.');
        } else {
            console.log('[DEV ERROR] SMTP Failed but continuing because of development mode.');
            logDevOtpIfPresent(options, 'SMTP_FAILED');
        }
    }
};
