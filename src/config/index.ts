import dotenv from 'dotenv';
import path from 'path';


dotenv.config({ path: path.join(__dirname, '../../.env') });

const pickFirstNonEmpty = (...values: Array<string | undefined>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
};

const parseNumber = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
};

const smtpHost = pickFirstNonEmpty(
  process.env.SMTP_HOST,
  process.env.EMAIL_HOST,
  process.env.MAIL_HOST,
  'smtp.mailtrap.io'
);
const smtpPort = parseNumber(
  pickFirstNonEmpty(process.env.SMTP_PORT, process.env.EMAIL_PORT, process.env.MAIL_PORT, '2525'),
  2525
);
const smtpUser = pickFirstNonEmpty(process.env.SMTP_USER, process.env.EMAIL_USER, process.env.MAIL_USER);
const smtpPass = pickFirstNonEmpty(process.env.SMTP_PASS, process.env.EMAIL_PASS, process.env.MAIL_PASS);
const smtpSecure =
  parseBoolean(pickFirstNonEmpty(process.env.SMTP_SECURE, process.env.EMAIL_SECURE, process.env.MAIL_SECURE)) ??
  smtpPort === 465;
const smtpRequireTLS =
  parseBoolean(
    pickFirstNonEmpty(process.env.SMTP_REQUIRE_TLS, process.env.EMAIL_REQUIRE_TLS, process.env.MAIL_REQUIRE_TLS)
  ) ?? false;
const fromEmail = pickFirstNonEmpty(
  process.env.FROM_EMAIL,
  process.env.EMAIL_FROM,
  process.env.SMTP_FROM_EMAIL,
  smtpUser,
  'no-reply@emdr.com'
);
const fromName = pickFirstNonEmpty(process.env.FROM_NAME, process.env.EMAIL_FROM_NAME, 'EMDR Admin');

const resendApiKey = pickFirstNonEmpty(process.env.RESEND_API_KEY);
const resendFromEmail = pickFirstNonEmpty(process.env.RESEND_FROM_EMAIL, fromEmail);
const resendFromName = pickFirstNonEmpty(process.env.RESEND_FROM_NAME, fromName);

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
    requireTLS: boolean;
    fromEmail: string;
    fromName: string;
  };
  resend: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  stripe: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
    apiVersion: string;
  };
}


const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/emdr-db'
  },

  email: {
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    pass: smtpPass,
    secure: smtpSecure,
    requireTLS: smtpRequireTLS,
    fromEmail,
    fromName,
  },

  resend: {
    apiKey: resendApiKey,
    fromEmail: resendFromEmail,
    fromName: resendFromName,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: process.env.STRIPE_API_VERSION || '2024-11-20.acacia',
  }
};

export default config;
