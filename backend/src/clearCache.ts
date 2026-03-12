/**
 * Clear all AI analysis caches (forecast + risk + benchmark) for all startups.
 * Use this when you change AI models to force regeneration.
 * Run: npx ts-node src/clearCache.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import AnalysisCache from './models/ForecastCache';

async function clearCache() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ Connected\n');

    const result = await AnalysisCache.deleteMany({});
    console.log(`🗑️  Cleared ${result.deletedCount} cached AI results (forecast + risk + benchmark)`);
    console.log('✅ Done — next page visit will regenerate AI analysis with current model.\n');

    await mongoose.disconnect();
    process.exit(0);
}

clearCache().catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
});
