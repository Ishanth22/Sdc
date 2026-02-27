import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from './models/User';
import StartupProfile from './models/StartupProfile';
import Metrics from './models/Metrics';
import VitalityScore from './models/VitalityScore';
import Benchmark from './models/Benchmark';
import { calculateVitalityScore } from './services/vitalityScore';
import { computeBenchmarks } from './services/benchmarkAggregator';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://lmelvindenish_db_user:melvindenish@cluster0.t5hb9cw.mongodb.net/nspms?appName=Cluster0';

// Sample Indian startups
const STARTUPS_DATA = [
    { email: 'founder1@nspms.in', company: 'PaySwift', sector: 'Fintech', stage: 'Growth', city: 'Bengaluru', team: 320, founder: 'Arun Mehta', founded: '2017-03-15' },
    { email: 'founder2@nspms.in', company: 'MedPulse', sector: 'Healthtech', stage: 'Early', city: 'Mumbai', team: 85, founder: 'Priya Kapoor', founded: '2019-07-01' },
    { email: 'founder3@nspms.in', company: 'LearnVerse', sector: 'Edtech', stage: 'Growth', city: 'New Delhi', team: 220, founder: 'Vikram Singh', founded: '2018-01-10' },
    { email: 'founder4@nspms.in', company: 'FarmConnect', sector: 'Agritech', stage: 'Seed', city: 'Pune', team: 18, founder: 'Deepa Rao', founded: '2022-05-20' },
    { email: 'founder5@nspms.in', company: 'ShopEase', sector: 'Ecommerce', stage: 'Growth', city: 'Bengaluru', team: 450, founder: 'Ravi Kumar', founded: '2016-11-05' },
    { email: 'founder6@nspms.in', company: 'CloudNova', sector: 'SaaS', stage: 'Early', city: 'Hyderabad', team: 65, founder: 'Sneha Reddy', founded: '2020-02-14' },
    { email: 'founder7@nspms.in', company: 'GreenWatt', sector: 'CleanTech', stage: 'Seed', city: 'Chennai', team: 22, founder: 'Karthik Iyer', founded: '2023-01-08' },
    { email: 'founder8@nspms.in', company: 'NeuroAI Labs', sector: 'DeepTech', stage: 'Early', city: 'Bengaluru', team: 45, founder: 'Ananya Bose', founded: '2021-06-01' },
    { email: 'founder9@nspms.in', company: 'QuickShip', sector: 'Logistics', stage: 'Growth', city: 'Gurugram', team: 280, founder: 'Amit Joshi', founded: '2017-09-22' },
    { email: 'founder10@nspms.in', company: 'FinEdge', sector: 'Fintech', stage: 'Early', city: 'Mumbai', team: 55, founder: 'Meera Nair', founded: '2020-08-15' },
    { email: 'founder11@nspms.in', company: 'HealthBridge', sector: 'Healthtech', stage: 'Growth', city: 'Bengaluru', team: 180, founder: 'Rahul Sharma', founded: '2018-04-10' },
    { email: 'founder12@nspms.in', company: 'SkillUp India', sector: 'Edtech', stage: 'Seed', city: 'Jaipur', team: 12, founder: 'Pooja Gupta', founded: '2023-06-01' },
    { email: 'founder13@nspms.in', company: 'AgriDrone', sector: 'Agritech', stage: 'Early', city: 'Indore', team: 35, founder: 'Suresh Patel', founded: '2021-03-15' },
    { email: 'founder14@nspms.in', company: 'StyleKart', sector: 'Ecommerce', stage: 'Early', city: 'Mumbai', team: 90, founder: 'Neha Verma', founded: '2019-12-01' },
    { email: 'founder15@nspms.in', company: 'DataForge', sector: 'SaaS', stage: 'Growth', city: 'Pune', team: 150, founder: 'Ajay Deshmukh', founded: '2017-07-20' }
];

// Generate random metrics for a startup
function generateMetrics(stage: string, monthOffset: number) {
    const multiplier = stage === 'Growth' ? 3 : stage === 'Early' ? 1.5 : 0.5;
    const growth = 1 + monthOffset * 0.05; // 5% monthly growth

    return {
        financial: {
            revenue: Math.round((200000 + Math.random() * 800000) * multiplier * growth),
            burnRate: Math.round((100000 + Math.random() * 400000) * multiplier),
            runwayMonths: Math.round(6 + Math.random() * 18),
            fundingAmount: monthOffset % 3 === 0 ? Math.round(Math.random() * 5000000 * multiplier) : 0,
            fundingType: monthOffset % 3 === 0 ? 'Equity' : 'None',
            investorName: monthOffset % 3 === 0 ? 'Sequoia Capital India' : ''
        },
        operational: {
            activeUsers: Math.round((1000 + Math.random() * 50000) * multiplier * growth),
            newUsers: Math.round((100 + Math.random() * 5000) * multiplier * growth),
            cac: Math.round(50 + Math.random() * 500),
            ltv: Math.round(200 + Math.random() * 2000 * multiplier),
            gmv: Math.round(Math.random() * 10000000 * multiplier),
            citiesServed: Math.round(1 + Math.random() * 20 * multiplier)
        },
        innovation: {
            patentsFiled: Math.round(Math.random() * 3),
            patentsGranted: Math.round(Math.random() * 1),
            trademarksFiled: Math.round(Math.random() * 2),
            rndSpend: Math.round((50000 + Math.random() * 300000) * multiplier)
        },
        impact: {
            directJobs: Math.round((10 + Math.random() * 100) * multiplier),
            womenEmployees: Math.round((5 + Math.random() * 50) * multiplier),
            ruralEmployees: Math.round(Math.random() * 20 * multiplier),
            exportsInr: Math.round(Math.random() * 2000000 * multiplier)
        }
    };
}

async function seed() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear all collections
        await Promise.all([
            User.deleteMany({}),
            StartupProfile.deleteMany({}),
            Metrics.deleteMany({}),
            VitalityScore.deleteMany({}),
            Benchmark.deleteMany({})
        ]);
        console.log('🗑️  Cleared existing data');

        const passwordHash = await bcrypt.hash('password123', 10);

        // Create admin user
        const admin = await User.create({
            email: 'admin@nspms.in',
            passwordHash,
            role: 'admin'
        });
        console.log('👤 Admin created: admin@nspms.in / password123');

        // Create startups with users, profiles, and 6 months of metrics
        const periods = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];

        for (const sd of STARTUPS_DATA) {
            // Create user
            const user = await User.create({
                email: sd.email,
                passwordHash,
                role: 'founder'
            });

            // Create startup profile
            const profile = await StartupProfile.create({
                userId: user._id,
                companyName: sd.company,
                cin: `CIN${sd.company.toUpperCase().replace(/\s/g, '')}${Date.now()}`,
                sector: sd.sector,
                stage: sd.stage,
                foundedDate: new Date(sd.founded),
                city: sd.city,
                teamSize: sd.team,
                website: `https://${sd.company.toLowerCase().replace(/\s/g, '')}.in`,
                description: `${sd.company} is a ${sd.sector} startup based in ${sd.city}.`
            });

            // Create 6 months of metrics
            for (let i = 0; i < periods.length; i++) {
                const metricsData = generateMetrics(sd.stage, i);
                await Metrics.create({
                    startupId: profile._id,
                    period: periods[i],
                    ...metricsData
                });
            }

            console.log(`🏢 Created ${sd.company} (${sd.sector}, ${sd.stage}) with 6 months of metrics`);
        }

        // Compute benchmarks for all periods
        for (const period of periods) {
            await computeBenchmarks(period);
        }
        console.log('📊 Benchmarks computed');

        // Calculate vitality scores for all startups for the latest period
        const allProfiles = await StartupProfile.find();
        for (const profile of allProfiles) {
            for (const period of periods) {
                try {
                    await calculateVitalityScore(profile._id, period);
                } catch (e) {
                    // Skip if no metrics
                }
            }
        }
        console.log('⚡ Vitality scores calculated');

        console.log('\n✅ Seed complete! You can now log in with:');
        console.log('   Admin:   admin@nspms.in / password123');
        console.log('   Founder: founder1@nspms.in / password123');
        console.log('   (founder1 through founder15 all use password123)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
}

seed();
