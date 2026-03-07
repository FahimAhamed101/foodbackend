import { SystemConfig } from '../models/systemConfig.model';
import AppError from '../utils/AppError';

class SystemConfigService {
    /**
     * Get a setting by key
     */
    async getSetting(key: string) {
        const config = await SystemConfig.findOne({ key });
        return config ? config.value : null;
    }

    /**
     * Update or create a setting
     */
    async updateSetting(key: string, value: any, description?: string) {
        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { $set: { value, description } },
            { upsert: true, new: true, runValidators: true }
        );
        return config;
    }

    /**
     * Specific helper for Logo Management
     */
    async getAppLogo() {
        return await this.getSetting('app_logo');
    }

    async updateAppLogo(logoUrl: string) {
        return await this.updateSetting('app_logo', logoUrl, 'Main application logo used in headers, emails, and dashboard.');
    }

    async deleteAppLogo() {
        return await SystemConfig.findOneAndDelete({ key: 'app_logo' });
    }

    /**
     * Specific helper for Platform Fees
     */
    async getPlatformFeeConfig() {
        const fee = await this.getSetting('platform_fee');
        // Default to { type: 'fixed', value: 0 } if not set
        return fee || { type: 'fixed', value: 0 };
    }

    async updatePlatformFee(type: 'fixed' | 'percentage', value: number) {
        return await this.updateSetting('platform_fee', { type, value }, 'Global platform fee applied to every order.');
    }

    async deletePlatformFee() {
        return await SystemConfig.findOneAndDelete({ key: 'platform_fee' });
    }

    /**
     * Restaurant Dashboard Permissions
     */
    async getRestaurantDashboardPermissions() {
        const permissions = await this.getSetting('restaurant_dashboard_permissions');
        // Default permissions if not set
        return permissions || { showUserDistributionByCity: true };
    }

    async updateRestaurantDashboardPermissions(permissions: { showUserDistributionByCity: boolean }) {
        return await this.updateSetting(
            'restaurant_dashboard_permissions',
            permissions,
            'Controls visibility of specific data cards in the restaurant owner dashboard.'
        );
    }

    /**
     * Get all public settings
     */
    async getAllPublicSettings() {
        const configs = await SystemConfig.find({
            key: { $in: ['app_logo', 'app_name', 'primary_color'] }
        });

        const settings: any = {};
        configs.forEach(c => {
            settings[c.key] = c.value;
        });

        return settings;
    }
}

export default new SystemConfigService();
