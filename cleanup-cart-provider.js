// Cleanup Script - Remove providerId from Cart Collection
// Run this with: node cleanup-cart-provider.js

const mongoose = require('mongoose');

// Update this with your MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/emdr-db';

async function cleanup() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Removing providerId field from carts collection...');
        
        const result = await mongoose.connection.db.collection('carts').updateMany(
            {},
            { $unset: { providerId: "" } }
        );

        console.log(`✅ Updated ${result.modifiedCount} cart documents`);
        console.log(`📊 Matched ${result.matchedCount} cart documents`);

        // Verify the cleanup
        const sampleCart = await mongoose.connection.db.collection('carts').findOne({});
        console.log('\n📋 Sample cart after cleanup:');
        console.log(JSON.stringify(sampleCart, null, 2));

        console.log('\n✅ Cleanup completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB connection closed');
        process.exit(0);
    }
}

cleanup();
