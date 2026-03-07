import connectDB from './database/db';
import stateSeeder from './services/stateSeeder.service';

const runSeeder = async () => {
    try {
        console.log('🚀 Connecting to database...');
        await connectDB();

        console.log('✅ Database connected successfully\n');

        await stateSeeder.seedStates();

        console.log('\n✅ Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

runSeeder();
