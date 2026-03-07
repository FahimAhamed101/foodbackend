import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config';
// import AppError from './utils/AppError';
// import globalErrorHandler from './middlewares/errorMiddleware';
import authRoutes from './routes/auth.routes';
import oauthRoutes from './routes/oauth.routes';
import categoryRoutes from './routes/category.routes';
import foodRoutes from './routes/food.routes';
import orderRoutes from './routes/order.routes';
import dashboardRoutes from './routes/dashboard.routes';
import providerRoutes from './routes/provider.routes';
import reviewRoutes from './routes/review.routes';
import notificationRoutes from './routes/notification.routes';
import feedRoutes from './routes/feed.routes';
import profileRoutes from './routes/profile.routes';
import customerOrderRoutes from './routes/customerOrder.routes';
import favoriteRoutes from './routes/favorite.routes';
import analyticsRoutes from './routes/analytics.routes';
import paymentRoutes from './routes/payment.routes';
import stateRoutes from './routes/state.routes';
import cartRoutes from './routes/cart.routes';
import chatRoutes from './routes/chat.routes';
import bannerRoutes from './routes/banner.routes';
import adminAnalyticsRoutes from './routes/adminAnalytics.routes';
import adminRestaurantRoutes from './routes/adminRestaurant.routes';
import activityRoutes from './routes/activity.routes';
import adminCustomerRoutes from './routes/adminCustomer.routes';
import adminTransactionRoutes from './routes/adminTransaction.routes';
import adminOrderRoutes from './routes/adminOrder.routes';
import adminDashboardRoutes from './routes/adminDashboard.routes';
import adminUserRoutes from './routes/adminUser.routes';
import adminTaxRoutes from './routes/adminTax.routes';
import adminLegalDocumentRoutes from './routes/adminLegalDocument.routes';
import adminPaymentMethodRoutes from './routes/adminPaymentMethod.routes';
import providerOnboardingRoutes from './routes/providerOnboarding.routes';
import paymentMethodRoutes from './routes/paymentMethod.routes';
import supportTicketRoutes from './routes/supportTicket.routes';
import complianceRoutes from './routes/compliance.routes';
import systemConfigRoutes from './routes/systemConfig.routes';
import adminNotificationRoutes from './routes/adminNotification.routes';
import uploadRoutes from './services/cloudinary.service';
import globalErrorHandler from './middlewares/errorMiddleware';
import AppError from './utils/AppError';
import stripeRoutes from './routes/stripe.routes';
import topRatedRoutes from './routes/topRated.routes';
import locationRoutes from './routes/location.routes';

const app = express();

// Set trust proxy for express-rate-limit (useful for cloudflared/proxies)
app.set('trust proxy', 1);

// 1) GLOBAL MIDDLEWARES
app.use(cors());

if (config.env === 'development') {
    app.use(morgan('dev'));
}

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 2) ROUTES
app.use('/api/v1/stripe', stripeRoutes);
app.use('/api/v1/media', uploadRoutes);
app.use('/api/v1/states', stateRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payment-methods', paymentMethodRoutes);
app.use('/api/auth', oauthRoutes); // Google OAuth routes
app.use('/api/v1', providerOnboardingRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/provider', providerRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/top-rated', topRatedRoutes);
app.use('/api/v1/location', locationRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/customer/orders', customerOrderRoutes);
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/provider/analytics', analyticsRoutes);
app.use('/api/v1/provider/payments', paymentRoutes);
app.use('/api/v1/banners', bannerRoutes);
app.use('/api/v1/admin/banners', bannerRoutes);
app.use('/api/v1/admin/analytics', adminAnalyticsRoutes);
app.use('/api/v1/admin/dashboard', adminAnalyticsRoutes);
app.use('/api/v1/admin', adminRestaurantRoutes);
app.use('/api/v1/admin/customers', adminCustomerRoutes);
app.use('/api/v1/admin/transactions-orders', adminTransactionRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/users', adminUserRoutes);
app.use('/api/v1/admin/payment-methods', adminPaymentMethodRoutes);
app.use('/api/v1/admin', adminDashboardRoutes);
app.use('/api/v1/admin/tax', adminTaxRoutes);
app.use('/api/v1/admin/legal', adminLegalDocumentRoutes);
app.use('/api/v1/support', supportTicketRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/config', systemConfigRoutes);
app.use('/api/v1/admin/config', systemConfigRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);


app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
        message: 'Welcome to the EMDR Backend API (TypeScript)!'
    });
});

app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});


app.use(globalErrorHandler);

export default app;
