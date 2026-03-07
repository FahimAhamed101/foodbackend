import app from './app';
import config from './config';
import connectDB from './database/db';
import { initJobs } from './jobs/cleanup.job';
import { socketService } from './services/socket.service';

process.on('uncaughtException', (err: Error) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    console.log(err.stack)
    process.exit(1);
});

connectDB();

const server = app.listen(5000, async () => {
    console.log(`App running on port ${config.port}...`);
    initJobs();
    socketService.init(server);

    // Cleanup any obsolete database indexes
    const reviewService = (await import('./services/review.service')).default;
    await reviewService.cleanupObsoleteIndexes();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
