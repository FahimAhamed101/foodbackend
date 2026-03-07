import customerOrderService from '../services/customerOrder.service';


export const initJobs = () => {
    console.log('[JOBS] Initializing background jobs...');

   
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

    setInterval(async () => {
        try {
            console.log('[JOBS] Running scheduled order cleanup...');
            await customerOrderService.cleanupOldOrders();
        } catch (error) {
            console.error('[JOBS] Error during order cleanup:', error);
        }
    }, CLEANUP_INTERVAL);

    customerOrderService.cleanupOldOrders().catch(err => {
        console.error('[JOBS] Initial cleanup failed:', err);
    });
};
