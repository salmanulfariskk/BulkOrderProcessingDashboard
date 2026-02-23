require('dotenv').config();
const mongoose = require('mongoose');

async function dropIndexes() {
    try {
        // 1. Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB successfully.');

        // 2. Drop the indexes
        const db = mongoose.connection.db;

        // First, list indexes to see what exists
        console.log('Fetching indexes for collection "users"...');
        const indexes = await db.collection('users').indexes();
        const indexNames = indexes.map(i => i.name);
        console.log('Current indexes:', indexNames);

        const legacyIndexes = ['username_1', 'referralCode_1', 'placementParent_1'];

        for (const indexName of legacyIndexes) {
            if (indexNames.includes(indexName)) {
                console.log(`Dropping index "${indexName}"...`);
                const result = await db.collection('users').dropIndex(indexName);
                console.log(`Drop index result for ${indexName}:`, result);
                console.log(`✅ Successfully removed the legacy ${indexName} requirement.`);
            } else {
                console.log(`Index "${indexName}" not found. It might have already been dropped.`);
            }
        }
    } catch (error) {
        console.error('❌ Error dropping index:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

dropIndexes();
