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

const resendClient =
  config.resend?.apiKey ? new Resend(config.resend.apiKey) : null;

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

const buildHtml = (options: EmailOptions) => {
  if (options.html) return options.html;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <p>${options.message.replace(/\n/g, '<br/>')}</p>
    </div>
  `;
};

const sendViaResend = async (options: EmailOptions) => {
  if (!resendClient) {
    throw new AppError(
      'Resend is not configured. Missing RESEND_API_KEY.',
      500,
      'EMAIL_CONFIG_MISSING'
    );
  }

  if (!config.resend?.fromEmail) {
    throw new AppError(
      'Resend sender email is not configured. Missing RESEND_FROM_EMAIL.',
      500,
      'EMAIL_CONFIG_MISSING'
    );
  }

  const { data, error } = await resendClient.emails.send({
    from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
    to: [options.email],
    subject: options.subject,
    text: options.message,
    html: buildHtml(options),
  });

  if (error) {
    throw new AppError(
      error.message || 'Failed to send email via Resend API',
      502,
      'EMAIL_DELIVERY_FAILED'
    );
  }

  return data;
};

const sendViaSmtp = async (options: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: Number(config.email.port),
    secure: Boolean(config.email.secure), // true for 465, false for 587
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  await transporter.verify();

  await transporter.sendMail({
    from: `${config.email.fromName} <${config.email.fromEmail}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: buildHtml(options),
  });
};

export const sendEmail = async (options: EmailOptions) => {
  console.log(
    `[DEBUG] Attempting to send email to: ${options.email} with subject: ${options.subject}`
  );

  const hasResendConfig = Boolean(
    config.resend?.apiKey && config.resend?.fromEmail
  );

  const hasSmtpConfig = Boolean(
    config.email?.host &&
      config.email?.port &&
      config.email?.user &&
      config.email?.pass &&
      config.email?.fromEmail
  );

  if (!hasResendConfig && !hasSmtpConfig && config.env !== 'production') {
    renderMockEmail(options);
    return;
  }

  if (!hasResendConfig && !hasSmtpConfig) {
    throw new AppError(
      'Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL, or valid SMTP settings.',
      500,
      'EMAIL_CONFIG_MISSING'
    );
  }

  // Prefer Resend API first
  if (hasResendConfig) {
    try {
      await sendViaResend(options);
      console.log(`Email sent to ${options.email} via Resend API`);
      logDevOtpIfPresent(options, 'RESEND_SUCCESS');
      return;
    } catch (error: any) {
      console.error('Resend API failed:', error);

      // Only fallback to SMTP if SMTP is intentionally configured
      if (hasSmtpConfig) {
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
        throw new AppError(
          error?.message || 'Failed to send email. Please try again later.',
          502,
          'EMAIL_DELIVERY_FAILED'
        );
      }

      console.log('[DEV ERROR] Email provider failed but continuing because of development mode.');
      renderMockEmail(options);
      logDevOtpIfPresent(options, 'DELIVERY_FAILED_DEV_FALLBACK');
      return;
    }
  }

  // SMTP only path
  try {
    await sendViaSmtp(options);
    console.log(`Email sent to ${options.email} via SMTP`);
    logDevOtpIfPresent(options, 'SMTP_SUCCESS');
  } catch (error: any) {
    console.error('SMTP failed:', error);

    if (config.env === 'production') {
      throw new AppError(
        error?.message || 'Failed to send email. Please try again later.',
        502,
        'EMAIL_DELIVERY_FAILED'
      );
    }

    console.log('[DEV ERROR] SMTP failed but continuing because of development mode.');
    renderMockEmail(options);
    logDevOtpIfPresent(options, 'SMTP_FAILED_DEV_FALLBACK');
  }
};