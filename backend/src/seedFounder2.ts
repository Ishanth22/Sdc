import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// ── Minimal inline schemas ──────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    name: String, email: String, passwordHash: String,
    role: { type: String, default: 'founder' },
    isActive: { type: Boolean, default: true },
    organizationId: mongoose.Schema.Types.ObjectId,
    orgRole: String,
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: Date
}, { timestamps: true });

const profileSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    companyName: String, sector: String, stage: String,
    city: String, teamSize: Number, foundedDate: Date,
    cin: String, website: String, linkedin: String, description: String
}, { timestamps: true });

const metricsSchema = new mongoose.Schema({
    startupId: mongoose.Schema.Types.ObjectId,
    period: String,
    financial: {
        revenue: Number, monthlyExpenses: Number, burnRate: Number,
        runwayMonths: Number, totalFundingRaised: Number,
        latestFundingAmount: Number, latestFundingType: String, latestInvestorName: String
    },
    operational: {
        activeUsers: Number, newUsers: Number, cac: Number, ltv: Number,
        churnRate: Number, gmv: Number, citiesServed: Number
    },
    innovation: { patentsFiled: Number, patentsGranted: Number, trademarksFiled: Number, rndSpend: Number },
    impact: { directJobsCreated: Number, womenEmployees: Number, ruralEmployees: Number, exports: Number }
}, { timestamps: true });

const vitalitySchema = new mongoose.Schema({
    startupId: mongoose.Schema.Types.ObjectId,
    period: String, score: Number,
    components: {
        revenueGrowth: Number, userGrowth: Number, burnEfficiency: Number,
        churnStability: Number, runwayStability: Number
    },
    riskFlags: [String]
}, { timestamps: true });

const milestoneSchema = new mongoose.Schema({
    startupId: mongoose.Schema.Types.ObjectId,
    title: String, description: String, category: String,
    deadline: Date, completionPercent: Number, completed: Boolean,
    isOKR: Boolean, objectiveType: String, keyResults: Array
}, { timestamps: true });

const kpiSchema = new mongoose.Schema({
    startupId: mongoose.Schema.Types.ObjectId,
    name: String, formula: String, unit: String, description: String,
    values: [{ period: String, value: Number }]
}, { timestamps: true });

const orgSchema = new mongoose.Schema({
    name: String, ownerId: mongoose.Schema.Types.ObjectId,
    members: Array, invites: { type: Array, default: [] }
}, { timestamps: true });

const subSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId, plan: String
}, { timestamps: true });

// ── DB Models ───────────────────────────────────────────────────────────────
const User = mongoose.models.User || mongoose.model('User', userSchema);
const StartupProfile = mongoose.models.StartupProfile || mongoose.model('StartupProfile', profileSchema);
const Metrics = mongoose.models.Metrics || mongoose.model('Metrics', metricsSchema);
const VitalityScore = mongoose.models.VitalityScore || mongoose.model('VitalityScore', vitalitySchema);
const Milestone = mongoose.models.Milestone || mongoose.model('Milestone', milestoneSchema);
const CustomKPI = mongoose.models.CustomKPI || mongoose.model('CustomKPI', kpiSchema);
const Organization = mongoose.models.Organization || mongoose.model('Organization', orgSchema);
const Subscription = mongoose.models.Subscription || mongoose.model('Subscription', subSchema);

// ── Helper ──────────────────────────────────────────────────────────────────
function score(rev: number, revPrev: number, users: number, usersPrev: number,
    burn: number, churn: number, runway: number) {
    const rg = revPrev > 0 ? Math.min(100, Math.max(0, ((rev - revPrev) / revPrev) * 200)) : 50;
    const ug = usersPrev > 0 ? Math.min(100, Math.max(0, ((users - usersPrev) / usersPrev) * 200)) : 50;
    const be = rev > 0 ? Math.min(100, Math.round((rev / burn) * 60)) : 10;
    const cs = Math.max(0, 100 - churn * 7);
    const rs = Math.min(100, Math.round((runway / 18) * 100));
    const total = Math.round(rg * 0.25 + ug * 0.20 + be * 0.20 + cs * 0.15 + rs * 0.20);
    const flags: string[] = [];
    if (runway < 6) flags.push('Low runway');
    if (churn > 10) flags.push('High churn');
    if (burn > rev * 2) flags.push('High burn relative to revenue');
    if (rg < 30) flags.push('Slow revenue growth');
    return { total: Math.max(0, Math.min(100, total)), components: { revenueGrowth: Math.round(rg), userGrowth: Math.round(ug), burnEfficiency: Math.round(be), churnStability: Math.round(cs), runwayStability: Math.round(rs) }, flags };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function seed() {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ Connected\n');

    // ── 1. Create / reset user + org + subscription ───────────────────────
    const email = 'founder2@nspms.in';
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        await Organization.deleteOne({ ownerId: existingUser._id });
        await Subscription.deleteOne({ userId: existingUser._id });
        await User.deleteOne({ email });
    }
    const hashed = await bcrypt.hash('password123', 10);
    const user = await User.create({
        name: 'Priya Nair',
        email,
        passwordHash: hashed,   // ← must match what auth.ts reads
        role: 'founder',
        isActive: true,
        failedLoginAttempts: 0
    });

    // Create Organization (required so auth/me works correctly)
    const org = await Organization.create({
        name: 'PaisaPro Fintech',
        ownerId: user._id,
        members: [{ userId: user._id, role: 'owner', joinedAt: new Date() }],
        invites: []
    });
    user.organizationId = org._id;
    user.orgRole = 'owner';
    await user.save();

    // Create Subscription (enterprise so all features are accessible)
    await Subscription.create({ userId: user._id, plan: 'enterprise' });
    console.log('👤 Created user:', email);

    // ── 2. Startup Profile ─────────────────────────────────────────────────
    await StartupProfile.deleteOne({ userId: user._id });
    const profile = await StartupProfile.create({
        userId: user._id,
        companyName: 'PaisaPro Fintech',
        sector: 'Fintech',
        stage: 'Seed',
        city: 'Chennai',
        teamSize: 14,
        foundedDate: new Date('2023-06-01'),
        cin: 'U65192TN2023PTC091567',
        website: 'https://paisapro.in',
        linkedin: 'https://linkedin.com/company/paisapro',
        description: 'PaisaPro is a UPI-based micro-lending platform targeting tier-2/3 cities with real-time credit scoring using alternative data sources.'
    });
    console.log('🏢 Created profile: PaisaPro Fintech');

    // ── 3. Metrics (9 months: Jul 2024 → Mar 2025) ─────────────────────────
    // Fintech startup with:
    // - Strong revenue growth (NBFC license boost in Q4)
    // - Very high burn (tech infra + RBI compliance costs)
    // - Dangerously low runway (4-5 months by end)
    // - High churn early, improving later
    // - Low LTV/CAC ratio (classic fintech early problem)
    const monthsData = [
        // period, revenue, expenses, burnRate, runway, funding, users, newUsers, cac, ltv, churn, rnd, jobs
        ['2024-07', 180000, 980000, 1050000, 11, 12000000, 3200, 800, 3200, 8500, 14.5, 180000, 12],
        ['2024-08', 220000, 1080000, 1150000, 9, 12000000, 4100, 1100, 3000, 8800, 13.2, 195000, 13],
        ['2024-09', 310000, 1200000, 1280000, 8, 12000000, 5600, 1700, 2800, 9100, 12.1, 210000, 14],
        ['2024-10', 420000, 1350000, 1420000, 7, 12000000, 7800, 2500, 2600, 9400, 10.8, 230000, 14],
        ['2024-11', 580000, 1480000, 1550000, 6, 12000000, 11200, 3800, 2400, 9800, 9.5, 250000, 15],
        ['2024-12', 760000, 1600000, 1680000, 5, 12000000, 15500, 5100, 2200, 10200, 8.4, 270000, 16], // NBFC provisional
        ['2025-01', 940000, 1750000, 1830000, 4, 12000000, 20800, 6200, 2000, 10600, 7.6, 290000, 17],
        ['2025-02', 1150000, 1900000, 1980000, 3, 12000000, 27100, 7400, 1850, 11000, 6.9, 310000, 18],
        ['2025-03', 1380000, 2050000, 2140000, 3, 12000000, 34500, 8600, 1700, 11400, 6.2, 330000, 18],
    ];

    await Metrics.deleteMany({ startupId: profile._id });
    await VitalityScore.deleteMany({ startupId: profile._id });

    let prevRev = 0, prevUsers = 0;
    for (const [period, rev, exp, burn, runway, funding, users, newU, cac, ltv, churn, rnd, jobs] of monthsData) {
        await Metrics.create({
            startupId: profile._id,
            period,
            financial: {
                revenue: rev, monthlyExpenses: exp, burnRate: burn,
                runwayMonths: runway, totalFundingRaised: funding,
                latestFundingAmount: 12000000, latestFundingType: 'Equity',
                latestInvestorName: 'Kalaari Capital'
            },
            operational: {
                activeUsers: users, newUsers: newU,
                cac, ltv, churnRate: churn,
                gmv: (rev as number) * 8, citiesServed: 12
            },
            innovation: { patentsFiled: 1, patentsGranted: 0, trademarksFiled: 2, rndSpend: rnd },
            impact: { directJobsCreated: jobs, womenEmployees: 6, ruralEmployees: 4, exports: 0 }
        });

        const s = score(rev as number, prevRev, users as number, prevUsers, burn as number, churn as number, runway as number);
        await VitalityScore.create({
            startupId: profile._id,
            period,
            score: s.total,
            components: s.components,
            riskFlags: s.flags
        });

        prevRev = rev as number;
        prevUsers = users as number;
        console.log(`  📊 ${period}: Rev ₹${((rev as number) / 1000).toFixed(0)}K | Users ${users} | Score ${s.total} | Runway ${runway}mo`);
    }

    // ── 4. Milestones ──────────────────────────────────────────────────────
    await Milestone.deleteMany({ startupId: profile._id });
    const milestones = [
        { title: 'RBI NBFC Provisional License', category: 'legal', completionPercent: 100, completed: true, deadline: new Date('2024-11-30'), description: 'Obtain provisional NBFC license from Reserve Bank of India for micro-lending operations' },
        { title: 'Tamil Nadu Tier-2 City Launch', category: 'market', completionPercent: 100, completed: true, deadline: new Date('2024-12-15'), description: 'Launch in 8 tier-2 cities: Madurai, Coimbatore, Salem, Tirupur, Tiruchirappalli, Vellore, Erode, Tirunelveli' },
        { title: 'AI Credit Scoring Model v2', category: 'product', completionPercent: 78, completed: false, deadline: new Date('2025-04-15'), description: 'New ML model using alternate data (mobile usage, utility bills, social scores) to improve loan approval rates' },
        { title: 'Series A Fundraise ₹5 Cr', category: 'funding', completionPercent: 35, completed: false, deadline: new Date('2025-05-31'), description: 'Raise Series A to extend runway to 18+ months and accelerate Andhra Pradesh expansion' },
        { title: 'Zero-Touch KYC Integration', category: 'product', completionPercent: 60, completed: false, deadline: new Date('2025-04-30'), description: 'Aadhaar eKYC + Video KYC integration to reduce onboarding time from 3 days to 2 hours' },
        {
            title: 'Q1 2025 OKR - Improve Unit Economics', category: 'other', completionPercent: 55, completed: false,
            deadline: new Date('2025-03-31'), description: 'Achieve sustainable unit economics before Series A',
            isOKR: true, objectiveType: 'quarterly',
            keyResults: [
                { title: 'Reduce CAC below ₹1,500', target: 1500, current: 1700, unit: '₹' },
                { title: 'Increase LTV above ₹12,000', target: 12000, current: 11400, unit: '₹' },
                { title: 'Reduce churn below 5%', target: 5, current: 6.2, unit: '%' },
                { title: 'Reach 40,000 active users', target: 40000, current: 34500, unit: 'users' }
            ]
        }
    ];

    for (const m of milestones) {
        await Milestone.create({ startupId: profile._id, ...m });
    }
    console.log(`\n🎯 Created ${milestones.length} milestones`);

    // ── 5. Custom KPIs ─────────────────────────────────────────────────────
    await CustomKPI.deleteMany({ startupId: profile._id });
    const kpis = [
        {
            name: 'Loan Book Size (₹L)',
            formula: 'totalActiveLoans × avgLoanAmount',
            unit: '₹L',
            description: 'Total outstanding loan portfolio. Target: ₹2Cr+ for Series A',
            values: [
                { period: '2024-07', value: 12.4 }, { period: '2024-08', value: 18.7 },
                { period: '2024-09', value: 28.3 }, { period: '2024-10', value: 42.1 },
                { period: '2024-11', value: 61.8 }, { period: '2024-12', value: 89.4 },
                { period: '2025-01', value: 121.6 }, { period: '2025-02', value: 162.3 },
                { period: '2025-03', value: 208.7 }
            ]
        },
        {
            name: 'NPA Rate (%)',
            formula: 'badLoans / totalLoansDisb × 100',
            unit: '%',
            description: 'Non-Performing Asset rate. RBI limit: < 5%. Lower is better.',
            values: [
                { period: '2024-07', value: 4.2 }, { period: '2024-08', value: 4.1 },
                { period: '2024-09', value: 3.9 }, { period: '2024-10', value: 3.7 },
                { period: '2024-11', value: 3.5 }, { period: '2024-12', value: 3.3 },
                { period: '2025-01', value: 3.1 }, { period: '2025-02', value: 2.9 },
                { period: '2025-03', value: 2.7 }
            ]
        },
        {
            name: 'Loan Approval Rate (%)',
            formula: 'approvedApplications / totalApplications × 100',
            unit: '%',
            description: 'Credit model approval rate. Target: 45–55% (balance risk vs growth)',
            values: [
                { period: '2024-07', value: 38.2 }, { period: '2024-08', value: 39.5 },
                { period: '2024-09', value: 41.1 }, { period: '2024-10', value: 42.8 },
                { period: '2024-11', value: 44.3 }, { period: '2024-12', value: 45.9 },
                { period: '2025-01', value: 47.2 }, { period: '2025-02', value: 48.6 },
                { period: '2025-03', value: 49.8 }
            ]
        },
        {
            name: 'LTV / CAC Ratio',
            formula: 'ltv / cac',
            unit: 'x',
            description: 'Customer value vs acquisition cost. Target: > 3x. Currently below target — key concern.',
            values: [
                { period: '2024-07', value: 2.7 }, { period: '2024-08', value: 2.9 },
                { period: '2024-09', value: 3.3 }, { period: '2024-10', value: 3.6 },
                { period: '2024-11', value: 4.1 }, { period: '2024-12', value: 4.6 },
                { period: '2025-01', value: 5.3 }, { period: '2025-02', value: 5.9 },
                { period: '2025-03', value: 6.7 }
            ]
        }
    ];

    for (const kpi of kpis) {
        await CustomKPI.create({ startupId: profile._id, ...kpi });
    }
    console.log(`📐 Created ${kpis.length} custom KPIs`);

    console.log('\n✅ Done! Second founder seeded:');
    console.log('────────────────────────────────────────');
    console.log('  Email   : founder2@nspms.in');
    console.log('  Password: password123');
    console.log('  Startup : PaisaPro Fintech');
    console.log('  Sector  : Fintech (Seed stage, Chennai)');
    console.log('  Investor: Kalaari Capital (₹1.2Cr)');
    console.log('  Metrics : 9 months (Jul 2024 → Mar 2025)');
    console.log('  Story   : High-growth but critically low runway (3mo)');
    console.log('            RBI NBFC licensee | LTV/CAC improving');
    console.log('────────────────────────────────────────');

    await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
