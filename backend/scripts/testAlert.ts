/**
 * Sends a live test alert (email + SMS) to founder1's registered alert contacts.
 * Run: npx ts-node --project tsconfig.json scripts/testAlert.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from '../src/models/User';
import StartupProfile from '../src/models/StartupProfile';
import { sendTestAlert } from '../src/services/alertNotifier';

const FOUNDER_LOGIN_EMAIL = 'founder1@nspms.in';

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Connected to MongoDB');

    const user = await User.findOne({ email: FOUNDER_LOGIN_EMAIL });
    if (!user) { console.error('❌ User not found'); process.exit(1); }

    const profile = await StartupProfile.findOne({ userId: user._id });
    if (!profile) { console.error('❌ Profile not found'); process.exit(1); }

    const email = (profile as any).alertEmail;
    const phone = (profile as any).alertPhone;

    console.log(`📧 Sending test to email : ${email}`);
    console.log(`📱 Sending test to phone : ${phone}`);

    const result = await sendTestAlert(email || undefined, phone || undefined);

    if (result.ok) {
        console.log('✅ Test alert sent successfully!');
    } else {
        console.error('⚠️  Sent with issues:', result.errors);
    }
    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
