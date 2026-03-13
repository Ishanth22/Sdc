/**
 * Seed script — creates demo accounts: founder, investor, admin
 * Run with: npx ts-node src/seed.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from './models/User';
import StartupProfile from './models/StartupProfile';
import Organization from './models/Organization';
import Subscription from './models/Subscription';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://lmelvindenish_db_user:melvindenish@cluster0.t5hb9cw.mongodb.net/nspms?appName=Cluster0';

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    const passwordHash = await bcrypt.hash('password123', 10);

    // ─── 1. FOUNDER ────────────────────────────────────────────────────
    let founder = await User.findOne({ email: 'founder1@nspms.in' });
    if (!founder) {
        founder = await User.create({
            email: 'founder1@nspms.in',
            passwordHash,
            name: 'Demo Founder',
            role: 'founder',
            failedLoginAttempts: 0,
            lockedUntil: undefined
        });

        const org = await Organization.create({
            name: 'Demo Startup',
            ownerId: founder._id,
            members: [{ userId: founder._id, role: 'owner' }]
        });

        founder.organizationId = org._id as mongoose.Types.ObjectId;
        founder.orgRole = 'owner';
        await founder.save();

        await StartupProfile.create({
            userId: founder._id,
            companyName: 'Demo Startup',
            cin: `CIN${Date.now()}`,
            sector: 'SaaS',
            stage: 'Seed',
            foundedDate: new Date('2023-01-01'),
            city: 'Bengaluru',
            teamSize: 5
        });

        await Subscription.create({ userId: founder._id, plan: 'free' });
        console.log('✅ Founder created: founder1@nspms.in / password123');
    } else {
        // Unlock account if it was locked after failed attempts
        founder.failedLoginAttempts = 0;
        founder.lockedUntil = undefined;
        founder.passwordHash = passwordHash;
        await founder.save();
        console.log('♻️  Founder already exists — password reset & unlocked: founder1@nspms.in');
    }

    // ─── 2. INVESTOR ───────────────────────────────────────────────────
    let investor = await User.findOne({ email: 'investor@nspms.in' });
    if (!investor) {
        await User.create({
            email: 'investor@nspms.in',
            passwordHash,
            name: 'Demo Investor',
            role: 'investor',
            failedLoginAttempts: 0
        });
        console.log('✅ Investor created: investor@nspms.in / password123');
    } else {
        investor.failedLoginAttempts = 0;
        investor.lockedUntil = undefined;
        investor.passwordHash = passwordHash;
        await investor.save();
        console.log('♻️  Investor already exists — password reset & unlocked: investor@nspms.in');
    }

    // ─── 3. ADMIN ──────────────────────────────────────────────────────
    let admin = await User.findOne({ email: 'admin@nspms.in' });
    if (!admin) {
        await User.create({
            email: 'admin@nspms.in',
            passwordHash,
            name: 'Demo Admin',
            role: 'admin',
            failedLoginAttempts: 0
        });
        console.log('✅ Admin created: admin@nspms.in / password123');
    } else {
        admin.failedLoginAttempts = 0;
        admin.lockedUntil = undefined;
        admin.passwordHash = passwordHash;
        await admin.save();
        console.log('♻️  Admin already exists — password reset & unlocked: admin@nspms.in');
    }

    console.log('\n🎉 Seed complete! Log in with:');
    console.log('   Founder:  founder1@nspms.in / password123');
    console.log('   Investor: investor@nspms.in  / password123');
    console.log('   Admin:    admin@nspms.in     / password123\n');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
