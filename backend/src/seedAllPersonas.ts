/**
 * seedAllPersonas.ts
 * Master seed — creates all 4 test personas with full mock data.
 *
 * Persona 1: founder1@nspms.in  — Arjun Mehta / NovaSaaS Technologies (SaaS, Series A) — healthy
 * Persona 2: founder2@nspms.in  — Priya Nair   / MedQuick Health (Healthtech, Seed)     — at-risk
 * Persona 3: investor@nspms.in  — Rohit Sharma  (Investor)
 * Persona 4: admin@nspms.in     — Sunita Das    (Admin)
 *
 * Run: npx ts-node src/seedAllPersonas.ts
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
import Metrics from './models/Metrics';
import Milestone from './models/Milestone';
import CustomKPI from './models/CustomKPI';
import VitalityScore from './models/VitalityScore';
import Benchmark from './models/Benchmark';
import Alert from './models/Alert';
import { calculateVitalityScore } from './services/vitalityScore';

const MONGO_URI =
    process.env.MONGO_URI ||
    'mongodb+srv://lmelvindenish_db_user:melvindenish@cluster0.t5hb9cw.mongodb.net/nspms?appName=Cluster0';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function upsertUser(
    email: string,
    name: string,
    role: 'founder' | 'investor' | 'admin',
    passwordHash: string
) {
    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({ email, passwordHash, name, role, failedLoginAttempts: 0 });
    } else {
        user.passwordHash = passwordHash;
        user.name = name;
        user.role = role;
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        await user.save();
    }
    return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function seedAll() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected\n');

    const hash = await bcrypt.hash('password123', 10);

    // =========================================================================
    // PERSONA 3 & 4 — Investor + Admin (non-founder, just user records)
    // =========================================================================
    const investor = await upsertUser('investor@nspms.in', 'Rohit Sharma', 'investor', hash);
    await Subscription.findOneAndUpdate(
        { userId: investor._id }, { plan: 'enterprise' }, { upsert: true }
    );
    console.log('✅ Investor: investor@nspms.in / password123');

    const admin = await upsertUser('admin@nspms.in', 'Sunita Das', 'admin', hash);
    await Subscription.findOneAndUpdate(
        { userId: admin._id }, { plan: 'enterprise' }, { upsert: true }
    );
    console.log('✅ Admin:    admin@nspms.in / password123\n');

    // =========================================================================
    // PERSONA 1 — Arjun Mehta / NovaSaaS Technologies (SaaS, Series A)
    // HEALTHY startup — all green metrics, great growth trajectory
    // =========================================================================
    const arjun = await upsertUser('founder1@nspms.in', 'Arjun Mehta', 'founder', hash);

    // Org
    let arjunOrg = await Organization.findOne({ ownerId: arjun._id });
    if (!arjunOrg) {
        arjunOrg = await Organization.create({
            name: 'NovaSaaS Technologies',
            ownerId: arjun._id,
            members: [{ userId: arjun._id, role: 'owner' }]
        });
        arjun.organizationId = arjunOrg._id as mongoose.Types.ObjectId;
        arjun.orgRole = 'owner';
        await arjun.save();
    }

    // Profile
    let arjunProfile = await StartupProfile.findOne({ userId: arjun._id });
    if (!arjunProfile) {
        arjunProfile = await StartupProfile.create({ userId: arjun._id, companyName: 'NovaSaaS Technologies', cin: 'U72900KA2023PTC175421', sector: 'SaaS', stage: 'Series A', foundedDate: new Date('2023-03-01'), city: 'Bengaluru', teamSize: 45 });
    }
    await StartupProfile.findByIdAndUpdate(arjunProfile._id, {
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
    await Subscription.findOneAndUpdate({ userId: arjun._id }, { plan: 'enterprise' }, { upsert: true });
    console.log('📊 Seeding Persona 1: NovaSaaS Technologies...');

    // Clear old data
    await Metrics.deleteMany({ startupId: arjunProfile._id });
    await Milestone.deleteMany({ startupId: arjunProfile._id });
    await CustomKPI.deleteMany({ startupId: arjunProfile._id });
    await VitalityScore.deleteMany({ startupId: arjunProfile._id });
    await Alert.deleteMany({ startupId: arjunProfile._id });

    // 8 months of healthy metrics (Aug 2024 → Mar 2025)
    const arjunMetrics = [
        { period: '2024-08', financial: { revenue: 180000, monthlyExpenses: 420000, burnRate: 240000, runwayMonths: 14, totalFunding: 3500000, fundingAmount: 3500000, fundingType: 'Equity', investorName: 'Accel India' }, operational: { activeUsers: 820, newUsers: 210, cac: 1800, ltv: 12000, churnRate: 6.2, gmv: 540000, citiesServed: 4 }, innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 55000 }, impact: { directJobs: 18, womenEmployees: 6, ruralEmployees: 2, exportsInr: 0 } },
        { period: '2024-09', financial: { revenue: 215000, monthlyExpenses: 435000, burnRate: 220000, runwayMonths: 13, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 980, newUsers: 260, cac: 1650, ltv: 12800, churnRate: 5.8, gmv: 645000, citiesServed: 5 }, innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 60000 }, impact: { directJobs: 20, womenEmployees: 7, ruralEmployees: 2, exportsInr: 0 } },
        { period: '2024-10', financial: { revenue: 278000, monthlyExpenses: 450000, burnRate: 172000, runwayMonths: 15, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 1240, newUsers: 380, cac: 1420, ltv: 13500, churnRate: 5.1, gmv: 834000, citiesServed: 6 }, innovation: { patentsFiled: 2, patentsGranted: 1, trademarksFiled: 1, rndSpend: 72000 }, impact: { directJobs: 23, womenEmployees: 8, ruralEmployees: 3, exportsInr: 0 } },
        { period: '2024-11', financial: { revenue: 342000, monthlyExpenses: 468000, burnRate: 126000, runwayMonths: 16, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 1580, newUsers: 450, cac: 1300, ltv: 14200, churnRate: 4.6, gmv: 1026000, citiesServed: 7 }, innovation: { patentsFiled: 2, patentsGranted: 1, trademarksFiled: 2, rndSpend: 78000 }, impact: { directJobs: 26, womenEmployees: 9, ruralEmployees: 3, exportsInr: 0 } },
        { period: '2024-12', financial: { revenue: 415000, monthlyExpenses: 480000, burnRate: 65000, runwayMonths: 18, totalFunding: 3500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 1950, newUsers: 520, cac: 1180, ltv: 15000, churnRate: 4.1, gmv: 1245000, citiesServed: 8 }, innovation: { patentsFiled: 3, patentsGranted: 1, trademarksFiled: 2, rndSpend: 85000 }, impact: { directJobs: 30, womenEmployees: 11, ruralEmployees: 4, exportsInr: 120000 } },
        { period: '2025-01', financial: { revenue: 498000, monthlyExpenses: 495000, burnRate: 0, runwayMonths: 22, totalFunding: 8000000, fundingAmount: 4500000, fundingType: 'Equity', investorName: 'Sequoia Surge' }, operational: { activeUsers: 2380, newUsers: 620, cac: 1050, ltv: 15800, churnRate: 3.8, gmv: 1494000, citiesServed: 10 }, innovation: { patentsFiled: 3, patentsGranted: 2, trademarksFiled: 3, rndSpend: 95000 }, impact: { directJobs: 36, womenEmployees: 13, ruralEmployees: 5, exportsInr: 250000 } },
        { period: '2025-02', financial: { revenue: 572000, monthlyExpenses: 510000, burnRate: 0, runwayMonths: 24, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 2840, newUsers: 680, cac: 980, ltv: 16500, churnRate: 3.4, gmv: 1716000, citiesServed: 11 }, innovation: { patentsFiled: 4, patentsGranted: 2, trademarksFiled: 3, rndSpend: 102000 }, impact: { directJobs: 40, womenEmployees: 15, ruralEmployees: 6, exportsInr: 380000 } },
        { period: '2025-03', financial: { revenue: 648000, monthlyExpenses: 528000, burnRate: 0, runwayMonths: 26, totalFunding: 8000000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 3350, newUsers: 740, cac: 920, ltv: 17200, churnRate: 3.1, gmv: 2010000, citiesServed: 13 }, innovation: { patentsFiled: 4, patentsGranted: 2, trademarksFiled: 4, rndSpend: 112000 }, impact: { directJobs: 45, womenEmployees: 17, ruralEmployees: 7, exportsInr: 520000 } }
    ];
    for (const m of arjunMetrics) {
        await Metrics.create({ startupId: arjunProfile._id, ...m });
        await calculateVitalityScore(arjunProfile._id, m.period);
        process.stdout.write(`  ✅ NovaSaaS Metrics: ${m.period}\n`);
    }

    // Milestones for Arjun
    const arjunMilestones = [
        { title: 'Seed Funding Round Closed', description: 'Successfully raised ₹3.5Cr seed round from Accel India to accelerate product development and hiring.', category: 'funding', deadline: new Date('2024-08-31'), completionPercent: 100, completed: true, completedAt: new Date('2024-08-20'), isOKR: false, keyResults: [] },
        { title: 'Launch Mobile App (iOS + Android)', description: 'Ship beta version of mobile app to first 500 users and gather retention data.', category: 'product', deadline: new Date('2024-10-15'), completionPercent: 100, completed: true, completedAt: new Date('2024-10-12'), isOKR: false, keyResults: [] },
        { title: 'Reach 1,000 Active Users', description: 'Grow to 1,000 monthly active users through product-led growth and referral campaigns.', category: 'market', deadline: new Date('2024-10-31'), completionPercent: 100, completed: true, completedAt: new Date('2024-10-28'), isOKR: true, objectiveType: 'quarterly', keyResults: [{ title: 'Monthly Active Users', target: 1000, current: 1240, unit: 'users' }, { title: 'Referral Signups', target: 200, current: 280, unit: 'users' }, { title: 'Churn Rate', target: 5, current: 5.1, unit: '%' }] },
        { title: 'ISO 27001 Security Certification', description: 'Complete security audit and obtain ISO 27001 certification to unlock enterprise contracts.', category: 'legal', deadline: new Date('2025-02-28'), completionPercent: 100, completed: true, completedAt: new Date('2025-02-14'), isOKR: false, keyResults: [] },
        { title: 'Series A Fundraise — ₹4.5Cr', description: 'Close Series A round with Sequoia Surge to expand to 10 cities and double engineering team.', category: 'funding', deadline: new Date('2025-01-31'), completionPercent: 100, completed: true, completedAt: new Date('2025-01-22'), isOKR: false, keyResults: [] },
        { title: 'Q1 2025 OKR: Revenue & Growth', description: 'Achieve ₹6L+ monthly revenue, 3,000+ active users, and expand to 12 new cities.', category: 'market', deadline: new Date('2025-03-31'), completionPercent: 95, completed: false, isOKR: true, objectiveType: 'quarterly', keyResults: [{ title: 'Monthly Revenue', target: 600000, current: 648000, unit: '₹' }, { title: 'Active Users', target: 3000, current: 3350, unit: 'users' }, { title: 'Cities Served', target: 12, current: 13, unit: 'cities' }, { title: 'CAC', target: 1000, current: 920, unit: '₹' }] },
        { title: 'Enterprise Tier Product Launch', description: 'Ship enterprise pricing tier with SSO, advanced analytics, and dedicated support for B2B clients.', category: 'product', deadline: new Date('2025-05-15'), completionPercent: 60, completed: false, isOKR: false, keyResults: [] },
        { title: 'Expand to Southeast Asia', description: 'Launch operations in Singapore and Malaysia. Target 200 international customers within 3 months.', category: 'market', deadline: new Date('2025-07-31'), completionPercent: 20, completed: false, isOKR: true, objectiveType: 'annual', keyResults: [{ title: 'International Users', target: 200, current: 40, unit: 'users' }, { title: 'Export Revenue', target: 2000000, current: 520000, unit: '₹' }, { title: 'Countries Live', target: 3, current: 1, unit: 'countries' }] },
        { title: 'Hire VP Engineering', description: 'Recruit a VP of Engineering from a Tier 1 tech company to lead the 15-person engineering team.', category: 'team', deadline: new Date('2025-04-30'), completionPercent: 40, completed: false, isOKR: false, keyResults: [] }
    ];
    for (const m of arjunMilestones) await Milestone.create({ startupId: arjunProfile._id, ...m });
    console.log(`  ✅ NovaSaaS: ${arjunMilestones.length} milestones`);

    // Custom KPIs for Arjun
    const arjunPeriods = arjunMetrics.map(m => m.period);
    await CustomKPI.create({ startupId: arjunProfile._id, name: 'LTV/CAC Ratio', formula: 'ltv / cac', unit: 'x', description: 'Lifetime Value to Customer Acquisition Cost ratio. Target: >3x', values: arjunMetrics.map((m, i) => ({ period: arjunPeriods[i], value: parseFloat((m.operational.ltv / m.operational.cac).toFixed(2)) })) });
    await CustomKPI.create({ startupId: arjunProfile._id, name: 'Revenue per Employee', formula: 'revenue / teamSize', unit: '₹', description: 'Monthly revenue per full-time employee — measures team efficiency.', values: [18000, 21500, 27800, 34200, 41500, 49800, 57200, 64800].map((v, i) => ({ period: arjunPeriods[i], value: v })) });
    await CustomKPI.create({ startupId: arjunProfile._id, name: 'Burn Multiple', formula: 'burnRate / newRevenue', unit: 'x', description: 'Net burn ÷ net new revenue. Target: <1x', values: [{ period: '2024-08', value: 6.9 }, { period: '2024-09', value: 5.1 }, { period: '2024-10', value: 2.7 }, { period: '2024-11', value: 1.9 }, { period: '2024-12', value: 0.9 }, { period: '2025-01', value: 0.0 }, { period: '2025-02', value: 0.0 }, { period: '2025-03', value: 0.0 }] });
    await CustomKPI.create({ startupId: arjunProfile._id, name: 'NRR (Net Revenue Retention)', formula: '(revenue - churned + expansion) / prevRevenue', unit: '%', description: 'Net Revenue Retention. Target: >100%', values: [{ period: '2024-08', value: 94 }, { period: '2024-09', value: 102 }, { period: '2024-10', value: 108 }, { period: '2024-11', value: 112 }, { period: '2024-12', value: 116 }, { period: '2025-01', value: 119 }, { period: '2025-02', value: 122 }, { period: '2025-03', value: 124 }] });
    console.log('  ✅ NovaSaaS: 4 custom KPIs\n');

    // =========================================================================
    // PERSONA 2 — Priya Nair / MedQuick Health (Healthtech, Seed)
    // AT-RISK startup — triggers all alerts, critical flags, overdue milestones
    // =========================================================================
    console.log('📊 Seeding Persona 2: MedQuick Health...');
    const priya = await upsertUser('founder2@nspms.in', 'Priya Nair', 'founder', hash);

    let priyaOrg = await Organization.findOne({ ownerId: priya._id });
    if (!priyaOrg) {
        priyaOrg = await Organization.create({
            name: 'MedQuick Health',
            ownerId: priya._id,
            members: [{ userId: priya._id, role: 'owner' }]
        });
        priya.organizationId = priyaOrg._id as mongoose.Types.ObjectId;
        priya.orgRole = 'owner';
        await priya.save();
    }

    let priyaProfile = await StartupProfile.findOne({ userId: priya._id });
    if (!priyaProfile) {
        priyaProfile = await StartupProfile.create({ userId: priya._id, companyName: 'MedQuick Health', cin: `CIN${Date.now()}`, sector: 'Healthtech', stage: 'Seed', foundedDate: new Date('2023-09-01'), city: 'Chennai', teamSize: 12 });
    }
    await StartupProfile.findByIdAndUpdate(priyaProfile._id, {
        companyName: 'MedQuick Health',
        sector: 'Healthtech',
        stage: 'Seed',
        city: 'Chennai',
        teamSize: 12,
        foundedDate: new Date('2023-09-01'),
        cin: 'U85110TN2023PTC098765',
        website: 'https://medquick.health',
        description: 'MedQuick Health is a telemedicine platform connecting rural patients in Tamil Nadu with certified doctors via WhatsApp-based video consultations. We reduce time-to-consultation from days to under 30 minutes.',
        linkedIn: 'https://linkedin.com/company/medquick-health',
        twitter: 'https://twitter.com/medquickhealth'
    });
    await Subscription.findOneAndUpdate({ userId: priya._id }, { plan: 'free' }, { upsert: true });

    // Clear old data
    await Metrics.deleteMany({ startupId: priyaProfile._id });
    await Milestone.deleteMany({ startupId: priyaProfile._id });
    await CustomKPI.deleteMany({ startupId: priyaProfile._id });
    await VitalityScore.deleteMany({ startupId: priyaProfile._id });
    await Alert.deleteMany({ startupId: priyaProfile._id });

    // 6 months of AT-RISK metrics (Oct 2024 → Mar 2025)
    // Designed to trigger: low runway alert, high churn alert, LTV/CAC < 1 alert, revenue decline
    const priyaMetrics = [
        { period: '2024-10', financial: { revenue: 85000, monthlyExpenses: 210000, burnRate: 125000, runwayMonths: 12, totalFunding: 1500000, fundingAmount: 1500000, fundingType: 'Grant', investorName: 'BIRAC' }, operational: { activeUsers: 340, newUsers: 120, cac: 2200, ltv: 3800, churnRate: 14.5, gmv: 102000, citiesServed: 2 }, innovation: { patentsFiled: 0, patentsGranted: 0, trademarksFiled: 1, rndSpend: 18000 }, impact: { directJobs: 8, womenEmployees: 4, ruralEmployees: 5, exportsInr: 0 } },
        { period: '2024-11', financial: { revenue: 92000, monthlyExpenses: 215000, burnRate: 123000, runwayMonths: 10, totalFunding: 1500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 380, newUsers: 130, cac: 2100, ltv: 3600, churnRate: 15.2, gmv: 114000, citiesServed: 2 }, innovation: { patentsFiled: 0, patentsGranted: 0, trademarksFiled: 1, rndSpend: 20000 }, impact: { directJobs: 9, womenEmployees: 4, ruralEmployees: 5, exportsInr: 0 } },
        { period: '2024-12', financial: { revenue: 78000, monthlyExpenses: 228000, burnRate: 150000, runwayMonths: 7, totalFunding: 1500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 350, newUsers: 90, cac: 2400, ltv: 3200, churnRate: 16.8, gmv: 93600, citiesServed: 2 }, innovation: { patentsFiled: 0, patentsGranted: 0, trademarksFiled: 1, rndSpend: 15000 }, impact: { directJobs: 9, womenEmployees: 4, ruralEmployees: 5, exportsInr: 0 } },
        { period: '2025-01', financial: { revenue: 65000, monthlyExpenses: 235000, burnRate: 170000, runwayMonths: 5, totalFunding: 1500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 310, newUsers: 70, cac: 2600, ltv: 2900, churnRate: 18.1, gmv: 78000, citiesServed: 1 }, innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 12000 }, impact: { directJobs: 10, womenEmployees: 5, ruralEmployees: 6, exportsInr: 0 } },
        { period: '2025-02', financial: { revenue: 71000, monthlyExpenses: 240000, burnRate: 169000, runwayMonths: 3, totalFunding: 1500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 295, newUsers: 65, cac: 2700, ltv: 2700, churnRate: 19.4, gmv: 71000, citiesServed: 1 }, innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 10000 }, impact: { directJobs: 10, womenEmployees: 5, ruralEmployees: 6, exportsInr: 0 } },
        { period: '2025-03', financial: { revenue: 58000, monthlyExpenses: 245000, burnRate: 187000, runwayMonths: 2, totalFunding: 1500000, fundingAmount: 0, fundingType: 'None', investorName: '' }, operational: { activeUsers: 270, newUsers: 50, cac: 2900, ltv: 2500, churnRate: 21.0, gmv: 58000, citiesServed: 1 }, innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 1, rndSpend: 8000 }, impact: { directJobs: 10, womenEmployees: 5, ruralEmployees: 6, exportsInr: 0 } }
    ];
    for (const m of priyaMetrics) {
        await Metrics.create({ startupId: priyaProfile._id, ...m });
        await calculateVitalityScore(priyaProfile._id, m.period);
        process.stdout.write(`  ✅ MedQuick Metrics: ${m.period}\n`);
    }

    // Milestones for Priya — many overdue, low completion
    const priyaMilestones = [
        { title: 'BIRAC Grant Disbursement', description: 'Receive first tranche of ₹15L from BIRAC grant for rural healthtech pilot.', category: 'funding', deadline: new Date('2024-10-15'), completionPercent: 100, completed: true, completedAt: new Date('2024-10-10'), isOKR: false, keyResults: [] },
        { title: 'Onboard 500 Active Patients', description: 'Reach 500 monthly active patients within 3 months of launch.', category: 'market', deadline: new Date('2024-12-31'), completionPercent: 70, completed: false, isOKR: true, objectiveType: 'quarterly', keyResults: [{ title: 'Active Patients', target: 500, current: 350, unit: 'patients' }, { title: 'Consultation Completion Rate', target: 85, current: 71, unit: '%' }, { title: 'Repeat Patients', target: 60, current: 38, unit: '%' }] },
        { title: 'Integrate 10 Specialist Doctors', description: 'Partner with 10 certified specialists (cardiologist, dermatologist, etc.) for premium consultations.', category: 'product', deadline: new Date('2024-11-30'), completionPercent: 40, completed: false, isOKR: false, keyResults: [] },
        { title: 'Telemedicine License (Tamil Nadu)', description: 'Obtain state-level telemedicine operating license from Tamil Nadu Health dept.', category: 'legal', deadline: new Date('2024-12-15'), completionPercent: 55, completed: false, isOKR: false, keyResults: [] },
        { title: 'Series Seed Fundraise — ₹2Cr', description: 'Close a ₹2Cr seed round to extend runway by 12 months and invest in doctor network.', category: 'funding', deadline: new Date('2025-02-28'), completionPercent: 20, completed: false, isOKR: false, keyResults: [] },
        { title: 'Reduce Churn Below 10%', description: 'Implement patient retention program (automated follow-ups, health reminders) to cut churn from 18% to under 10%.', category: 'market', deadline: new Date('2025-03-31'), completionPercent: 10, completed: false, isOKR: true, objectiveType: 'quarterly', keyResults: [{ title: 'Monthly Churn Rate', target: 10, current: 21, unit: '%' }, { title: 'Patient Satisfaction Score', target: 4.5, current: 3.8, unit: '/5' }, { title: 'Follow-up Completion Rate', target: 70, current: 32, unit: '%' }] },
        { title: 'Hire Head of Medical Operations', description: 'Recruit a qualified CMO or clinical lead to oversee consultation quality and compliance.', category: 'team', deadline: new Date('2025-01-31'), completionPercent: 0, completed: false, isOKR: false, keyResults: [] }
    ];
    for (const m of priyaMilestones) await Milestone.create({ startupId: priyaProfile._id, ...m });
    console.log(`  ✅ MedQuick: ${priyaMilestones.length} milestones (4 overdue)`);

    // Custom KPIs for Priya
    const priyaPeriods = priyaMetrics.map(m => m.period);
    await CustomKPI.create({ startupId: priyaProfile._id, name: 'LTV/CAC Ratio', formula: 'ltv / cac', unit: 'x', description: 'Customer lifetime value vs acquisition cost. Target: >3x. Currently CRITICAL <1x.', values: priyaMetrics.map((m, i) => ({ period: priyaPeriods[i], value: parseFloat((m.operational.ltv / m.operational.cac).toFixed(2)) })) });
    await CustomKPI.create({ startupId: priyaProfile._id, name: 'Consultation Completion Rate', formula: 'completed_consults / booked_consults', unit: '%', description: 'Percentage of booked consultations that are completed. Target: >85%', values: [{ period: '2024-10', value: 72 }, { period: '2024-11', value: 69 }, { period: '2024-12', value: 65 }, { period: '2025-01', value: 61 }, { period: '2025-02', value: 58 }, { period: '2025-03', value: 54 }] });
    await CustomKPI.create({ startupId: priyaProfile._id, name: 'Doctor Utilization Rate', formula: 'total_consults / (doctors * working_hours)', unit: '%', description: 'How efficiently doctors are being used. Target: >70%', values: [{ period: '2024-10', value: 45 }, { period: '2024-11', value: 48 }, { period: '2024-12', value: 41 }, { period: '2025-01', value: 38 }, { period: '2025-02', value: 35 }, { period: '2025-03', value: 31 }] });
    console.log('  ✅ MedQuick: 3 custom KPIs\n');

    // =========================================================================
    // BENCHMARK DATA — for Investor comparison and AI Benchmarking tab
    // =========================================================================
    console.log('📊 Seeding benchmark data...');
    const benchmarkPeriods = ['2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'];

    // SaaS / Series A benchmarks
    for (const period of benchmarkPeriods) {
        await Benchmark.findOneAndUpdate(
            { sector: 'SaaS', stage: 'Series A', period },
            { metrics: { avgRevenue: 420000, avgBurnRate: 380000, avgRunway: 18, avgCac: 1400, avgLtv: 14000, avgActiveUsers: 2000, avgTeamSize: 35, avgRndSpend: 85000 } },
            { upsert: true }
        );
    }

    // Healthtech / Seed benchmarks
    for (const period of benchmarkPeriods) {
        await Benchmark.findOneAndUpdate(
            { sector: 'Healthtech', stage: 'Seed', period },
            { metrics: { avgRevenue: 120000, avgBurnRate: 180000, avgRunway: 10, avgCac: 1800, avgLtv: 5500, avgActiveUsers: 500, avgTeamSize: 14, avgRndSpend: 25000 } },
            { upsert: true }
        );
    }

    // Additional sector benchmarks for investor dashboard filters
    for (const period of benchmarkPeriods) {
        await Benchmark.findOneAndUpdate(
            { sector: 'Fintech', stage: 'Seed', period },
            { metrics: { avgRevenue: 150000, avgBurnRate: 200000, avgRunway: 12, avgCac: 2000, avgLtv: 8000, avgActiveUsers: 400, avgTeamSize: 10, avgRndSpend: 30000 } },
            { upsert: true }
        );
        await Benchmark.findOneAndUpdate(
            { sector: 'Edtech', stage: 'Early', period },
            { metrics: { avgRevenue: 200000, avgBurnRate: 250000, avgRunway: 9, avgCac: 1600, avgLtv: 6500, avgActiveUsers: 800, avgTeamSize: 18, avgRndSpend: 40000 } },
            { upsert: true }
        );
    }
    console.log('  ✅ Benchmark data for SaaS/SeriesA + Healthtech/Seed + Fintech/Seed + Edtech/Early\n');

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('🎉 All personas seeded successfully!\n');
    console.log('─────────────────────────────────────────────────────');
    console.log('  CREDENTIALS (all passwords: password123)');
    console.log('─────────────────────────────────────────────────────');
    console.log('  🟢 Persona 1 (Founder - Healthy):');
    console.log('     Email:    founder1@nspms.in');
    console.log('     Startup:  NovaSaaS Technologies (SaaS / Series A)');
    console.log('     Plan:     Enterprise');
    console.log('     Data:     8 months metrics, 9 milestones, 4 KPIs\n');
    console.log('  🔴 Persona 2 (Founder - At-Risk):');
    console.log('     Email:    founder2@nspms.in');
    console.log('     Startup:  MedQuick Health (Healthtech / Seed)');
    console.log('     Plan:     Free');
    console.log('     Data:     6 months metrics, 7 milestones, 3 KPIs\n');
    console.log('  💼 Persona 3 (Investor):');
    console.log('     Email:    investor@nspms.in');
    console.log('     View:     Both startups in Investor Dashboard\n');
    console.log('  🛡️  Persona 4 (Admin):');
    console.log('     Email:    admin@nspms.in');
    console.log('     View:     Full Admin Dashboard + both startups\n');
    console.log('─────────────────────────────────────────────────────');
    console.log('  Open http://localhost:5173 to start testing!');
    console.log('─────────────────────────────────────────────────────\n');

    await mongoose.disconnect();
    process.exit(0);
}

seedAll().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
