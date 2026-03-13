import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import User from '../src/models/User';
import StartupProfile from '../src/models/StartupProfile';
import Alert from '../src/models/Alert';
import nodemailer from 'nodemailer';

async function main() {
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: 'founder1@nspms.in' });
    if (!user) { console.error('User not found'); process.exit(1); }

    const profile = await StartupProfile.findOne({ userId: user._id }) as any;
    if (!profile) { console.error('Profile not found'); process.exit(1); }

    // Show profile alert settings
    console.log('\n=== Profile Alert Settings ===');
    console.log('alertEmail   :', profile.alertEmail);
    console.log('alertPhone   :', profile.alertPhone);
    console.log('alertsEnabled:', profile.alertsEnabled);

    // Show active alerts
    const alerts = await Alert.find({ startupId: profile._id, dismissed: false }).sort({ createdAt: -1 });
    console.log('\n=== Active Alerts in DB ===');
    alerts.forEach(a => console.log(`[${a.severity}] ${a.type} | ${a.title} | created: ${a.createdAt}`));

    // Check Gmail config
    console.log('\n=== Gmail Config ===');
    console.log('GMAIL_USER:', process.env.GMAIL_USER || '❌ NOT SET');
    console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ set (' + process.env.GMAIL_APP_PASSWORD.length + ' chars)' : '❌ NOT SET');

    // Try sending email directly to see exact error
    if (profile.alertEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        console.log('\n=== Sending direct email ===');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
        });
        try {
            const info = await transporter.sendMail({
                from: `"NSPMS Alerts" <${process.env.GMAIL_USER}>`,
                to: profile.alertEmail,
                subject: '🚨 NSPMS - Alert Triggered',
                text: `Your startup has ${alerts.length} active alert(s). See dashboard for details.\n\nAlerts:\n${alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}`).join('\n')}`,
            });
            console.log('✅ Email sent! Message ID:', info.messageId);
        } catch (e: any) {
            console.error('❌ Email error:', e.message);
        }
    }

    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
