// Basic date range utility for dashboard filters

export type TimeFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

export const getDateRange = (filter: TimeFilter, startDate?: string, endDate?: string): DateRange => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (filter) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            // Start of current week (Sunday)
            const day = now.getDay();
            start.setDate(now.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start.setFullYear(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'year':
            start.setFullYear(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
            }
            break;
    }

    return { startDate: start, endDate: end };
};
