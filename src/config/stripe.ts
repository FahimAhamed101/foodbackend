import Stripe from 'stripe';
import config from './index';

if (!config.stripe.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

const stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
});

export default stripe;
