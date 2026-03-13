/**
 * One-time script: sets alertEmail + alertPhone for a specific founder.
 * Run: npx ts-node scripts/setAlertContact.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../src/models/User';
import StartupProfile from '../src/models/StartupProfile';

const FOUNDER_EMAIL = 'founder1@nspms.in';         // ← login email in DB
const ALERT_EMAIL   = 'rajaishanth2006@gmail.com';  // ← where alerts are sent
const ALERT_PHONE   = '+918838085680';              // ← E.164 format for Twilio

async function main() {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sdc');
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: FOUNDER_EMAIL.toLowerCase() });
    if (!user) {
        console.error(`❌ No user found with email: ${FOUNDER_EMAIL}`);
        process.exit(1);
    }

    const profile = await StartupProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { alertEmail: ALERT_EMAIL, alertPhone: ALERT_PHONE, alertsEnabled: true } },
        { new: true }
    );

    if (!profile) {
        console.error(`❌ No StartupProfile found for user: ${FOUNDER_EMAIL}`);
        process.exit(1);
    }

    console.log(`✅ Alert contacts set for "${profile.companyName}"`);
    console.log(`   📧 Email : ${ALERT_EMAIL}`);
    console.log(`   📱 Phone : ${ALERT_PHONE}`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
