/**
 * Demo data seed — populates 8 months of realistic metrics, milestones,
 * custom KPIs, and vitality scores for the demo founder account.
 * Run with: npx ts-node src/seedDemoData.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import User from './models/User';
import StartupProfile from './models/StartupProfile';
import Metrics from './models/Metrics';
import Milestone from './models/Milestone';
import CustomKPI from './models/CustomKPI';
import VitalityScore from './models/VitalityScore';
import { calculateVitalityScore } from './services/vitalityScore';

async function seedDemoData() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('✅ Connected\n');

    // Find the demo founder
    const user = await User.findOne({ email: 'founder1@nspms.in' });
    if (!user) {
        console.error('❌ Founder account not found. Run seed.ts first.');
        process.exit(1);
    }

    const profile = await StartupProfile.findOne({ userId: user._id });
    if (!profile) {
        console.error('❌ Startup profile not found.');
        process.exit(1);
    }

    const startupId = profile._id;
    console.log(`📊 Seeding demo data for: ${profile.companyName} (${startupId})\n`);

    // ─── Clear existing demo data ─────────────────────────────────────
    await Metrics.deleteMany({ startupId });
    await Milestone.deleteMany({ startupId });
    await CustomKPI.deleteMany({ startupId });
    await VitalityScore.deleteMany({ startupId });
    console.log('🗑️  Cleared existing data\n');

    // ─── 8 months of metrics (Aug 2024 → Mar 2025) ───────────────────
    // Realistic SaaS startup: growing revenue, managed burn, improving metrics
    const metricsData = [
        {
            period: '2024-08',
            financial: { revenue: 180000, monthlyExpenses: 420000, burnRate: 240000, runwayMonths: 14, totalFunding: 3500000, fundingAmount: 3500000, fundingType: 'Equity', investorName: 'Accel India' },
            operational: { activeUsers: 820, newUsers: 210, cac: 1800, ltv: 12000, churnRate: 6.2, gmv: 540000, citiesServed: 4 },
            innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 55000 },
            impact: { directJobs: 18, womenEmployees: 6, ruralEmployees: 2, exportsInr: 0 }
        },
        {
            period: '2024-09',
            financial: { revenue: 215000, monthlyExpenses: 435000, burnRate: 220000, runwayMonths: 13, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 980, newUsers: 260, cac: 1650, ltv: 12800, churnRate: 5.8, gmv: 645000, citiesServed: 5 },
            innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 60000 },
            impact: { directJobs: 20, womenEmployees: 7, ruralEmployees: 2, exportsInr: 0 }
        },
        {
            period: '2024-10',
            financial: { revenue: 278000, monthlyExpenses: 450000, burnRate: 172000, runwayMonths: 15, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1240, newUsers: 380, cac: 1420, ltv: 13500, churnRate: 5.1, gmv: 834000, citiesServed: 6 },
            innovation: { patentsFiled: 2, patentsGranted: 1, trademarksFiled: 1, rndSpend: 72000 },
            impact: { directJobs: 23, womenEmployees: 8, ruralEmployees: 3, exportsInr: 0 }
        },
        {
            period: '2024-11',
            financial: { revenue: 342000, monthlyExpenses: 468000, burnRate: 126000, runwayMonths: 16, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1580, newUsers: 450, cac: 1300, ltv: 14200, churnRate: 4.6, gmv: 1026000, citiesServed: 7 },
            innovation: { patentsFiled: 2, patentsGranted: 1, trademarksFiled: 2, rndSpend: 78000 },
            impact: { directJobs: 26, womenEmployees: 9, ruralEmployees: 3, exportsInr: 0 }
        },
        {
            period: '2024-12',
            financial: { revenue: 415000, monthlyExpenses: 480000, burnRate: 65000, runwayMonths: 18, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 1950, newUsers: 520, cac: 1180, ltv: 15000, churnRate: 4.1, gmv: 1245000, citiesServed: 8 },
            innovation: { patentsFiled: 3, patentsGranted: 1, trademarksFiled: 2, rndSpend: 85000 },
            impact: { directJobs: 30, womenEmployees: 11, ruralEmployees: 4, exportsInr: 120000 }
        },
        {
            period: '2025-01',
            financial: { revenue: 498000, monthlyExpenses: 495000, burnRate: 0, runwayMonths: 22, totalFunding: 8000000, fundingAmount: 4500000, fundingType: 'Equity', investorName: 'Sequoia Surge' },
            operational: { activeUsers: 2380, newUsers: 620, cac: 1050, ltv: 15800, churnRate: 3.8, gmv: 1494000, citiesServed: 10 },
            innovation: { patentsFiled: 3, patentsGranted: 2, trademarksFiled: 3, rndSpend: 95000 },
            impact: { directJobs: 36, womenEmployees: 13, ruralEmployees: 5, exportsInr: 250000 }
        },
        {
            period: '2025-02',
            financial: { revenue: 572000, monthlyExpenses: 510000, burnRate: 0, runwayMonths: 24, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 2840, newUsers: 680, cac: 980, ltv: 16500, churnRate: 3.4, gmv: 1716000, citiesServed: 11 },
            innovation: { patentsFiled: 4, patentsGranted: 2, trademarksFiled: 3, rndSpend: 102000 },
            impact: { directJobs: 40, womenEmployees: 15, ruralEmployees: 6, exportsInr: 380000 }
        },
        {
            period: '2025-03',
            financial: { revenue: 648000, monthlyExpenses: 528000, burnRate: 0, runwayMonths: 26, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' },
            operational: { activeUsers: 3350, newUsers: 740, cac: 920, ltv: 17200, churnRate: 3.1, gmv: 2010000, citiesServed: 13 },
            innovation: { patentsFiled: 4, patentsGranted: 2, trademarksFiled: 4, rndSpend: 112000 },
            impact: { directJobs: 45, womenEmployees: 17, ruralEmployees: 7, exportsInr: 520000 }
        }
    ];

    for (const m of metricsData) {
        await Metrics.create({ startupId, ...m });
        await calculateVitalityScore(startupId, m.period);
        process.stdout.write(`✅ Metrics + VitalityScore: ${m.period}\n`);
    }

    // ─── MILESTONES ───────────────────────────────────────────────────
    const now = new Date();
    const milestonesData = [
        {
            title: 'Seed Funding Round Closed',
            description: 'Successfully raised ₹3.5Cr seed round from Accel India to accelerate product development and hiring.',
            category: 'funding',
            deadline: new Date('2024-08-31'),
            completionPercent: 100,
            completed: true,
            completedAt: new Date('2024-08-20'),
            isOKR: false,
            keyResults: []
        },
        {
            title: 'Launch Mobile App (iOS + Android)',
            description: 'Ship beta version of mobile app to first 500 users and gather retention data.',
            category: 'product',
            deadline: new Date('2024-10-15'),
            completionPercent: 100,
            completed: true,
            completedAt: new Date('2024-10-12'),
            isOKR: false,
            keyResults: []
        },
        {
            title: 'Reach 1,000 Active Users',
            description: 'Grow to 1,000 monthly active users through product-led growth and referral campaigns.',
            category: 'market',
            deadline: new Date('2024-10-31'),
            completionPercent: 100,
            completed: true,
            completedAt: new Date('2024-10-28'),
            isOKR: true,
            objectiveType: 'quarterly',
            keyResults: [
                { title: 'Monthly Active Users', target: 1000, current: 1240, unit: 'users' },
                { title: 'Referral Signups', target: 200, current: 280, unit: 'users' },
                { title: 'Churn Rate', target: 5, current: 5.1, unit: '%' }
            ]
        },
        {
            title: 'ISO 27001 Security Certification',
            description: 'Complete security audit and obtain ISO 27001 certification to unlock enterprise contracts.',
            category: 'legal',
            deadline: new Date('2025-02-28'),
            completionPercent: 100,
            completed: true,
            completedAt: new Date('2025-02-14'),
            isOKR: false,
            keyResults: []
        },
        {
            title: 'Series A Fundraise — ₹4.5Cr',
            description: 'Close Series A round with Sequoia Surge to expand to 10 cities and double engineering team.',
            category: 'funding',
            deadline: new Date('2025-01-31'),
            completionPercent: 100,
            completed: true,
            completedAt: new Date('2025-01-22'),
            isOKR: false,
            keyResults: []
        },
        {
            title: 'Q1 2025 OKR: Revenue & Growth',
            description: 'Achieve ₹6L+ monthly revenue, 3,000+ active users, and expand to 12 new cities.',
            category: 'market',
            deadline: new Date('2025-03-31'),
            completionPercent: 95,
            completed: false,
            isOKR: true,
            objectiveType: 'quarterly',
            keyResults: [
                { title: 'Monthly Revenue', target: 600000, current: 648000, unit: '₹' },
                { title: 'Active Users', target: 3000, current: 3350, unit: 'users' },
                { title: 'Cities Served', target: 12, current: 13, unit: 'cities' },
                { title: 'CAC', target: 1000, current: 920, unit: '₹' }
            ]
        },
        {
            title: 'Enterprise Tier Product Launch',
            description: 'Ship enterprise pricing tier with SSO, advanced analytics, and dedicated support for B2B clients.',
            category: 'product',
            deadline: new Date('2025-05-15'),
            completionPercent: 60,
            completed: false,
            isOKR: false,
            keyResults: []
        },
        {
            title: 'Expand to Southeast Asia',
            description: 'Launch operations in Singapore and Malaysia. Target 200 international customers within 3 months of launch.',
            category: 'market',
            deadline: new Date('2025-07-31'),
            completionPercent: 20,
            completed: false,
            isOKR: true,
            objectiveType: 'annual',
            keyResults: [
                { title: 'International Users', target: 200, current: 40, unit: 'users' },
                { title: 'Export Revenue', target: 2000000, current: 520000, unit: '₹' },
                { title: 'Countries Live', target: 3, current: 1, unit: 'countries' }
            ]
        },
        {
            title: 'Hire VP Engineering',
            description: 'Recruit a VP of Engineering from a Tier 1 tech company to lead the 15-person engineering team.',
            category: 'team',
            deadline: new Date('2025-04-30'),
            completionPercent: 40,
            completed: false,
            isOKR: false,
            keyResults: []
        }
    ];

    for (const m of milestonesData) {
        await Milestone.create({ startupId, ...m });
    }
    console.log(`\n✅ ${milestonesData.length} milestones seeded`);

    // ─── CUSTOM KPIs ──────────────────────────────────────────────────
    const periods = metricsData.map(m => m.period);

    await CustomKPI.create({
        startupId,
        name: 'LTV/CAC Ratio',
        formula: 'ltv / cac',
        unit: 'x',
        description: 'Lifetime Value to Customer Acquisition Cost ratio — key SaaS health metric. Target: >3x',
        values: metricsData.map((m, i) => ({
            period: periods[i],
            value: parseFloat((m.operational.ltv / m.operational.cac).toFixed(2))
        }))
    });

    await CustomKPI.create({
        startupId,
        name: 'Revenue per Employee',
        formula: 'revenue / teamSize',
        unit: '₹',
        description: 'Monthly revenue per full-time employee — measures team efficiency.',
        values: [18000, 21500, 27800, 34200, 41500, 49800, 57200, 64800].map((v, i) => ({
            period: periods[i], value: v
        }))
    });

    await CustomKPI.create({
        startupId,
        name: 'Burn Multiple',
        formula: 'burnRate / newRevenue',
        unit: 'x',
        description: 'Net burn divided by net new revenue — measures capital efficiency. Target: <1x',
        values: [
            { period: '2024-08', value: 6.9 },
            { period: '2024-09', value: 5.1 },
            { period: '2024-10', value: 2.7 },
            { period: '2024-11', value: 1.9 },
            { period: '2024-12', value: 0.9 },
            { period: '2025-01', value: 0.0 },
            { period: '2025-02', value: 0.0 },
            { period: '2025-03', value: 0.0 }
        ]
    });

    await CustomKPI.create({
        startupId,
        name: 'NRR (Net Revenue Retention)',
        formula: '(revenue - churned + expansion) / prevRevenue',
        unit: '%',
        description: 'Net Revenue Retention — measures expansion vs churn. Target: >100%',
        values: [
            { period: '2024-08', value: 94 },
            { period: '2024-09', value: 102 },
            { period: '2024-10', value: 108 },
            { period: '2024-11', value: 112 },
            { period: '2024-12', value: 116 },
            { period: '2025-01', value: 119 },
            { period: '2025-02', value: 122 },
            { period: '2025-03', value: 124 }
        ]
    });

    console.log('✅ 4 custom KPIs seeded');

    // ─── Update profile with more detail ─────────────────────────────
    await StartupProfile.findByIdAndUpdate(startupId, {
        companyName: 'NovaSaaS Technologies',
        sector: 'SaaS',
        stage: 'Series A',
        city: 'Bengaluru',
        teamSize: 45,
        foundedDate: new Date('2023-03-01'),
        cin: 'U72900KA2023PTC175421',
        website: 'https://novasaas.in',
        description: 'NovaSaaS is an AI-powered workflow automation platform helping Indian SMBs digitize their operations. We replace fragmented tools with one unified platform — think Notion + Zapier built for Bharat.',
        linkedIn: 'https://linkedin.com/company/novasaas',
        twitter: 'https://twitter.com/novasaas_in'
    });
    console.log('✅ Startup profile enriched');

    console.log('\n🎉 Demo data seeded successfully!');
    console.log('   📊 8 months of metrics (Aug 2024 → Mar 2025)');
    console.log('   🏆 8 vitality scores computed');
    console.log('   🎯 9 milestones (5 completed, 4 in progress)');
    console.log('   📈 4 custom KPIs');
    console.log('   🏢 Startup: NovaSaaS Technologies (SaaS / Series A)\n');

    await mongoose.disconnect();
    process.exit(0);
}

seedDemoData().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
