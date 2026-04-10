
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from './models/User';
import StartupProfile from './models/StartupProfile';
import Organization from './models/Organization';
import Subscription from './models/Subscription';
import Metrics from './models/Metrics';
import Milestone from './models/Milestone';
import CustomKPI from './models/CustomKPI';
import VitalityScore from './models/VitalityScore';
import Alert from './models/Alert';
import { calculateVitalityScore } from './services/vitalityScore';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://lmelvindenish_db_user:melvindenish@cluster0.t5hb9cw.mongodb.net/nspms?appName=Cluster0';

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    // ── User ────────────────────────────────────────────────────────────────
    const email = 'founder1@nspms.in';
    const hash = await bcrypt.hash('password123', 10);
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({ email, passwordHash: hash, name: 'Arjun Mehta', role: 'founder', failedLoginAttempts: 0 });
    } else {
        user.passwordHash = hash;
        user.name = 'Arjun Mehta';
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        await user.save();
    }

    // ── Organization ─────────────────────────────────────────────────────────
    let org = await Organization.findOne({ ownerId: user._id });
    if (!org) {
        org = await Organization.create({
            name: 'NovaSaaS Technologies',
            ownerId: user._id,
            members: [{ userId: user._id, role: 'owner', joinedAt: new Date() }]
        });
        user.organizationId = org._id as mongoose.Types.ObjectId;
        user.orgRole = 'owner';
        await user.save();
    }
    await Subscription.findOneAndUpdate({ userId: user._id }, { plan: 'enterprise' }, { upsert: true });

    // ── Startup Profile ───────────────────────────────────────────────────────
    let profile = await StartupProfile.findOne({ userId: user._id });
    if (!profile) {
        profile = await StartupProfile.create({ userId: user._id, companyName: 'NovaSaaS Technologies', cin: 'U72900KA2023PTC175421', sector: 'SaaS', stage: 'Series A', foundedDate: new Date('2023-03-01'), city: 'Bengaluru', teamSize: 38 });
    }
    await StartupProfile.findByIdAndUpdate(profile._id, {
        companyName: 'NovaSaaS Technologies',
        sector: 'SaaS',
        stage: 'Series A',
        city: 'Bengaluru',
        teamSize: 38,
        foundedDate: new Date('2023-03-01'),
        cin: 'U72900KA2023PTC175421',
        website: 'https://novasaas.in',
        linkedin: 'https://linkedin.com/company/novasaas',
        description: 'NovaSaaS is an AI-powered workflow automation platform helping Indian SMBs digitize their operations. We replace fragmented tools with one unified platform — think Notion + Zapier built for Bharat.',
    });

    // ── Clear old data ────────────────────────────────────────────────────────
    await Metrics.deleteMany({ startupId: profile._id });
    await VitalityScore.deleteMany({ startupId: profile._id });
    await Alert.deleteMany({ startupId: profile._id });
    await Milestone.deleteMany({ startupId: profile._id });
    await CustomKPI.deleteMany({ startupId: profile._id });

    // ── Metrics ──────────────────────────────────────────────────────────────
    // Target: ~75 health score, Low risk profile
    // - Revenue growth: steady ~10% MoM (good but not exceptional → score ~70)
    // - User growth:    steady ~12% MoM → score ~70-75
    // - Burn efficiency: rev ≈ 70% of burn → improving but not yet profitable → score ~65
    // - Churn:          3.5–4.5% → stable, no spikes → score ~80
    // - Runway:         15-18 months → comfortable → score ~80
    // - LTV/CAC:        always > 3x → no risk flag
    // - No consecutive revenue declines, no burn spike → Low risk
    const months = [
        {
            period: '2024-10',
            // Starting point: pre-growth phase, moderate metrics
            financial: { revenue: 210000, monthlyExpenses: 390000, burnRate: 180000, cashOnHand: 3150000, runwayMonths: 17, totalFunding: 3500000, fundingAmount: 3500000, fundingType: 'Equity', investorName: 'Accel India' },
            operational: { activeUsers: 1050, newUsers: 180, cac: 1650, ltv: 8200, churnRate: 4.5, gmv: 630000, citiesServed: 5 },
            innovation:  { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 52000 },
            impact:      { directJobs: 22, womenEmployees: 7, ruralEmployees: 2, exportsInr: 0 },
        },
        {
            period: '2024-11',
            // +10% revenue, +11% users, churn dips slightly, burn stable
            financial: { revenue: 234000, monthlyExpenses: 400000, burnRate: 166000, cashOnHand: 2984000, runwayMonths: 18, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1170, newUsers: 210, cac: 1580, ltv: 8900, churnRate: 4.2, gmv: 702000, citiesServed: 6 },
            innovation:  { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 58000 },
            impact:      { directJobs: 25, womenEmployees: 8, ruralEmployees: 3, exportsInr: 0 },
        },
        {
            period: '2024-12',
            // Seasonal SaaS boost: +13% revenue, +14% users, burn ticks up slightly (new hires)
            financial: { revenue: 265000, monthlyExpenses: 418000, burnRate: 153000, cashOnHand: 2831000, runwayMonths: 18, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1330, newUsers: 250, cac: 1490, ltv: 9600, churnRate: 4.0, gmv: 795000, citiesServed: 7 },
            innovation:  { patentsFiled: 2, patentsGranted: 0, trademarksFiled: 2, rndSpend: 64000 },
            impact:      { directJobs: 28, womenEmployees: 10, ruralEmployees: 3, exportsInr: 0 },
        },
        {
            period: '2025-01',
            // New funding round closes — fresh cash, runway extends, +10% revenue growth
            financial: { revenue: 292000, monthlyExpenses: 428000, burnRate: 136000, cashOnHand: 6445000, runwayMonths: 19, totalFunding: 8000000, fundingAmount: 4500000, fundingType: 'Equity', investorName: 'Sequoia Surge' },
            operational: { activeUsers: 1490, newUsers: 280, cac: 1400, ltv: 10200, churnRate: 3.8, gmv: 876000, citiesServed: 9 },
            innovation:  { patentsFiled: 2, patentsGranted: 1, trademarksFiled: 2, rndSpend: 72000 },
            impact:      { directJobs: 32, womenEmployees: 12, ruralEmployees: 5, exportsInr: 150000 },
        },
        {
            period: '2025-02',
            // Steady: +10% revenue, +12% users, burn slightly up (one new senior hire), churn holds
            financial: { revenue: 322000, monthlyExpenses: 445000, burnRate: 123000, cashOnHand: 6322000, runwayMonths: 18, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1670, newUsers: 310, cac: 1320, ltv: 10900, churnRate: 3.8, gmv: 966000, citiesServed: 10 },
            innovation:  { patentsFiled: 3, patentsGranted: 1, trademarksFiled: 3, rndSpend: 80000 },
            impact:      { directJobs: 35, womenEmployees: 13, ruralEmployees: 6, exportsInr: 280000 },
        },
        {
            period: '2025-03',
            // Latest: another solid month, +11% revenue, improving LTV/CAC, runway comfortable
            financial: { revenue: 358000, monthlyExpenses: 458000, burnRate: 100000, cashOnHand: 6222000, runwayMonths: 17, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1870, newUsers: 345, cac: 1240, ltv: 11600, churnRate: 3.6, gmv: 1074000, citiesServed: 12 },
            innovation:  { patentsFiled: 3, patentsGranted: 1, trademarksFiled: 3, rndSpend: 88000 },
            impact:      { directJobs: 38, womenEmployees: 14, ruralEmployees: 7, exportsInr: 420000 },
        },
    ];

    for (const m of months) {
        await Metrics.create({ startupId: profile._id, ...m });
        await calculateVitalityScore(profile._id, m.period);
        console.log(`  ✅ ${m.period}: Rev ₹${(m.financial.revenue / 1000).toFixed(0)}K | Users ${m.operational.activeUsers} | Runway ${m.financial.runwayMonths}mo | LTV/CAC ${(m.operational.ltv / m.operational.cac).toFixed(1)}x`);
    }

    // ── Milestones / OKRs ─────────────────────────────────────────────────────
    const milestones = [
        {
            title: 'Seed Funding Round Closed — ₹3.5Cr',
            description: 'Successfully raised ₹3.5Cr Seed round from Accel India to accelerate product development and hiring.',
            category: 'funding', deadline: new Date('2024-10-15'),
            completionPercent: 100, completed: true, completedAt: new Date('2024-10-12'), isOKR: false, keyResults: []
        },
        {
            title: 'Launch Integrations Marketplace',
            description: 'Ship 15 native integrations (Zoho, Tally, WhatsApp Business) to increase platform stickiness.',
            category: 'product', deadline: new Date('2024-11-20'),
            completionPercent: 100, completed: true, completedAt: new Date('2024-11-22'), isOKR: false, keyResults: []
        },
        {
            title: 'Reach 1,000 Active Users',
            description: 'Grow to 1,000 monthly active users through product-led growth and referral campaigns.',
            category: 'market', deadline: new Date('2024-11-30'),
            completionPercent: 100, completed: true, completedAt: new Date('2024-11-30'),
            isOKR: true, objectiveType: 'quarterly',
            keyResults: [
                { title: 'Monthly Active Users', target: 1000, current: 1170, unit: 'users' },
                { title: 'Referral Signups',     target: 150,  current: 187,  unit: 'users' },
                { title: 'Churn Rate',           target: 5,    current: 4.2,  unit: '%' }
            ]
        },
        {
            title: 'Series A Fundraise — ₹4.5Cr (Sequoia Surge)',
            description: 'Close Series A round to extend runway to 18+ months and expand engineering team.',
            category: 'funding', deadline: new Date('2025-01-31'),
            completionPercent: 100, completed: true, completedAt: new Date('2025-01-20'), isOKR: false, keyResults: []
        },
        {
            title: 'ISO 27001 Security Certification',
            description: 'Complete security audit and obtain ISO 27001 certification to unlock enterprise contracts.',
            category: 'legal', deadline: new Date('2025-02-28'),
            completionPercent: 100, completed: true, completedAt: new Date('2025-02-22'), isOKR: false, keyResults: []
        },
        {
            title: 'Q1 2025 OKR: Stable Growth & Retention',
            description: 'Achieve ₹3.5L+ MRR, 1,800+ active users, and sub-4% churn across all cohorts.',
            category: 'market', deadline: new Date('2025-03-31'),
            completionPercent: 95, completed: false,
            isOKR: true, objectiveType: 'quarterly',
            keyResults: [
                { title: 'Monthly Revenue',  target: 350000, current: 358000, unit: '₹' },
                { title: 'Active Users',     target: 1800,   current: 1870,   unit: 'users' },
                { title: 'Churn Rate',       target: 4.0,    current: 3.6,    unit: '%' },
                { title: 'CAC',              target: 1300,   current: 1240,   unit: '₹' }
            ]
        },
        {
            title: 'Enterprise Tier Launch',
            description: 'Ship enterprise pricing with SSO, advanced analytics, and dedicated support for B2B clients.',
            category: 'product', deadline: new Date('2025-05-31'),
            completionPercent: 45, completed: false, isOKR: false, keyResults: []
        },
        {
            title: 'Hire VP of Engineering',
            description: 'Recruit VP Engineering from Tier 1 tech company to lead the 15-person engineering team.',
            category: 'team', deadline: new Date('2025-04-30'),
            completionPercent: 60, completed: false, isOKR: false, keyResults: []
        },
        {
            title: 'Southeast Asia Expansion',
            description: 'Launch in Singapore and Malaysia. Target 200 international customers in first 3 months.',
            category: 'market', deadline: new Date('2025-09-30'),
            completionPercent: 18, completed: false,
            isOKR: true, objectiveType: 'annual',
            keyResults: [
                { title: 'International Users',  target: 200,     current: 36,     unit: 'users' },
                { title: 'Export Revenue (₹)',   target: 1500000, current: 420000, unit: '₹' },
                { title: 'Countries Live',       target: 3,       current: 1,      unit: 'countries' }
            ]
        },
    ];
    for (const m of milestones) await Milestone.create({ startupId: profile._id, ...m });
    console.log(`\n🎯 Created ${milestones.length} milestones / OKRs`);

    // ── Custom KPIs ───────────────────────────────────────────────────────────
    const periods = months.map(m => m.period);
    await CustomKPI.create({
        startupId: profile._id,
        name: 'LTV / CAC Ratio', formula: 'ltv / cac', unit: 'x',
        description: 'Customer Lifetime Value ÷ Acquisition Cost. Healthy target: > 3x.',
        values: months.map((m, i) => ({ period: periods[i], value: parseFloat((m.operational.ltv / m.operational.cac).toFixed(2)) }))
    });
    await CustomKPI.create({
        startupId: profile._id,
        name: 'Revenue per Employee', formula: 'revenue / teamSize', unit: '₹',
        description: 'Monthly revenue per full-time employee — measures team efficiency.',
        values: [
            { period: '2024-10', value: 5526 }, { period: '2024-11', value: 6158 },
            { period: '2024-12', value: 6974 }, { period: '2025-01', value: 7684 },
            { period: '2025-02', value: 8474 }, { period: '2025-03', value: 9421 }
        ]
    });
    await CustomKPI.create({
        startupId: profile._id,
        name: 'Burn Multiple', formula: 'netBurn / netNewRevenue', unit: 'x',
        description: 'Net burn ÷ net new ARR added. Target < 1x. Healthy: improving trend.',
        values: [
            { period: '2024-10', value: 7.5 }, { period: '2024-11', value: 6.9 },
            { period: '2024-12', value: 4.9 }, { period: '2025-01', value: 5.0 },
            { period: '2025-02', value: 4.1 }, { period: '2025-03', value: 2.8 }
        ]
    });
    await CustomKPI.create({
        startupId: profile._id,
        name: 'NRR (Net Revenue Retention)', formula: '(revenue - churned + expansion) / prevRevenue', unit: '%',
        description: 'Net Revenue Retention. > 100% means existing customers are expanding. Target: > 110%.',
        values: [
            { period: '2024-10', value: 94  }, { period: '2024-11', value: 101 },
            { period: '2024-12', value: 105 }, { period: '2025-01', value: 108 },
            { period: '2025-02', value: 110 }, { period: '2025-03', value: 113 }
        ]
    });
    console.log('📐 Created 4 custom KPIs');

    console.log('\n✅ founder1 demo data seeded! (~75 health, Low risk)');
    console.log('─────────────────────────────────────────────');
    console.log('  Email   : founder1@nspms.in');
    console.log('  Password: password123');
    console.log('  Startup : NovaSaaS Technologies (SaaS, Series A, Bengaluru)');
    console.log('  Data    : 6 months (Oct 2024 → Mar 2025)');
    console.log('  Story   : Steady growth, comfortable runway, improving efficiency');
    console.log('  Mar 2025: Rev ₹3.58L | Users 1,870 | Runway 17mo | Score ~75 | Low Risk');
    console.log('─────────────────────────────────────────────');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
