import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import Metrics from '../models/Metrics';
import VitalityScore from '../models/VitalityScore';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware: investor or admin only
const requireInvestorOrAdmin = (req: AuthRequest, res: Response, next: any) => {
    if (req.user?.role !== 'investor' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Investor or Admin access required' });
    }
    next();
};

router.use(authenticate, requireInvestorOrAdmin);

// GET /api/investor/portfolio-summary – portfolio-level analytics
router.get('/portfolio-summary', async (req: AuthRequest, res: Response) => {
    try {
        const allStartups = await StartupProfile.find();
        const scores = await VitalityScore.find().sort({ period: -1 });
        const latestMetrics = await Metrics.find().sort({ period: -1 });

        // Build portfolio-level stats
        let totalRevenue = 0, totalBurnRate = 0, totalUsers = 0, totalFunding = 0;
        let scoreSum = 0, scoreCount = 0;
        const riskDistribution = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
        const sectorDistribution: Record<string, { count: number, revenue: number, funding: number }> = {};
        const stageDistribution: Record<string, number> = {};
        const startupScores: { name: string, score: number, riskLevel: string }[] = [];

        const seen = new Set();
        for (const startup of allStartups) {
            const latestScore = scores.find(s => s.startupId.toString() === startup._id.toString());
            const latestM = latestMetrics.find(m => m.startupId.toString() === startup._id.toString() && !seen.has(startup._id.toString()));
            seen.add(startup._id.toString());

            if (latestM) {
                totalRevenue += latestM.financial.revenue;
                totalBurnRate += latestM.financial.burnRate;
                totalUsers += latestM.operational.activeUsers;
                totalFunding += latestM.financial.totalFunding || 0;
            }

            const score = latestScore?.score || 0;
            scoreSum += score;
            scoreCount++;

            const riskFlagCount = latestScore?.riskFlags?.length || 0;
            const riskLevel = riskFlagCount >= 4 ? 'Critical' : riskFlagCount >= 3 ? 'High' : riskFlagCount >= 1 ? 'Moderate' : 'Low';
            riskDistribution[riskLevel as keyof typeof riskDistribution]++;
            startupScores.push({ name: startup.companyName, score, riskLevel });

            // Sector distribution
            const sector = startup.sector || 'Other';
            if (!sectorDistribution[sector]) sectorDistribution[sector] = { count: 0, revenue: 0, funding: 0 };
            sectorDistribution[sector].count++;
            sectorDistribution[sector].revenue += latestM?.financial.revenue || 0;
            sectorDistribution[sector].funding += latestM?.financial.totalFunding || 0;

            // Stage distribution
            const stage = startup.stage || 'Unknown';
            stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
        }

        // Portfolio Risk Score (0-100, lower = riskier)
        const portfolioRiskScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

        // Funding distribution by sector
        const fundingDistribution = Object.entries(sectorDistribution).map(([sector, data]) => ({
            sector,
            count: data.count,
            totalRevenue: data.revenue,
            totalFunding: data.funding,
            avgRevenue: Math.round(data.revenue / data.count)
        })).sort((a, b) => b.totalFunding - a.totalFunding);

        res.json({
            portfolioRiskScore,
            totalStartups: allStartups.length,
            totalRevenue,
            totalBurnRate,
            totalUsers,
            totalFunding,
            avgScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
            riskDistribution,
            fundingDistribution,
            stageDistribution,
            topPerformers: startupScores.sort((a, b) => b.score - a.score).slice(0, 5),
            atRiskStartups: startupScores.filter(s => s.riskLevel === 'Critical' || s.riskLevel === 'High')
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/investor/startups – list all startups with filters and sorting
router.get('/startups', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sector = req.query.sector as string;
        const stage = req.query.stage as string;
        const search = req.query.search as string;
        const sortBy = req.query.sortBy as string || 'score';

        const filter: any = {};
        if (sector) filter.sector = sector;
        if (stage) filter.stage = stage;
        if (search) filter.companyName = { $regex: search, $options: 'i' };

        const total = await StartupProfile.countDocuments(filter);
        const startups = await StartupProfile.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const enriched = await Promise.all(startups.map(async (s) => {
            const score = await VitalityScore.findOne({ startupId: s._id }).sort({ period: -1 });
            const latestMetrics = await Metrics.findOne({ startupId: s._id }).sort({ period: -1 });
            const prevMetrics = latestMetrics ?
                await Metrics.findOne({
                    startupId: s._id,
                    period: { $lt: latestMetrics.period }
                }).sort({ period: -1 }) : null;

            let fundingReadiness = 0;
            if (latestMetrics) {
                if (latestMetrics.financial.revenue > 0) fundingReadiness += 15;
                if (latestMetrics.financial.revenue > 500000) fundingReadiness += 10;
                if (latestMetrics.operational.activeUsers > 1000) fundingReadiness += 15;
                if (latestMetrics.operational.activeUsers > 10000) fundingReadiness += 10;
                if (s.teamSize >= 20) fundingReadiness += 10;
                if (s.teamSize >= 50) fundingReadiness += 5;
                if (latestMetrics.financial.runwayMonths >= 6) fundingReadiness += 10;
                if (score && score.score >= 60) fundingReadiness += 15;
                if (score && score.score >= 80) fundingReadiness += 10;
            }

            let revenueGrowth: number | null = null;
            if (latestMetrics && prevMetrics && prevMetrics.financial.revenue > 0) {
                revenueGrowth = Math.round(((latestMetrics.financial.revenue - prevMetrics.financial.revenue) / prevMetrics.financial.revenue) * 100);
            }

            const riskFlagCount = score?.riskFlags?.length || 0;
            let riskLevel = 'Low';
            if (riskFlagCount >= 4) riskLevel = 'Critical';
            else if (riskFlagCount >= 3) riskLevel = 'High';
            else if (riskFlagCount >= 1) riskLevel = 'Moderate';

            return {
                ...s.toObject(),
                latestScore: score?.score || 0,
                riskFlags: score?.riskFlags || [],
                riskLevel,
                fundingReadiness: Math.min(100, fundingReadiness),
                latestRevenue: latestMetrics?.financial.revenue || 0,
                latestBurnRate: latestMetrics?.financial.burnRate || 0,
                latestRunway: latestMetrics?.financial.runwayMonths || 0,
                activeUsers: latestMetrics?.operational.activeUsers || 0,
                revenueGrowth,
                latestFunding: latestMetrics?.financial.totalFunding || latestMetrics?.financial.fundingAmount || 0
            };
        }));

        if (sortBy === 'score') {
            enriched.sort((a, b) => b.latestScore - a.latestScore);
        } else if (sortBy === 'funding') {
            enriched.sort((a, b) => b.fundingReadiness - a.fundingReadiness);
        } else if (sortBy === 'revenue') {
            enriched.sort((a, b) => b.latestRevenue - a.latestRevenue);
        }

        res.json({ startups: enriched, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/investor/startup/:id
router.get('/startup/:id', async (req: AuthRequest, res: Response) => {
    try {
        const startup = await StartupProfile.findById(req.params.id);
        if (!startup) {
            return res.status(404).json({ error: 'Startup not found' });
        }

        const metrics = await Metrics.find({ startupId: startup._id }).sort({ period: -1 });
        const scores = await VitalityScore.find({ startupId: startup._id }).sort({ period: 1 });

        res.json({ startup, metrics, scores });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/investor/compare?ids=id1,id2
router.get('/compare', async (req: AuthRequest, res: Response) => {
    try {
        const ids = ((req.query.ids as string) || '').split(',').filter(Boolean);
        if (ids.length < 2) {
            return res.status(400).json({ error: 'Provide at least 2 startup IDs' });
        }

        const comparisons = await Promise.all(ids.slice(0, 2).map(async (id) => {
            const startup = await StartupProfile.findById(id);
            if (!startup) return null;

            const latestMetrics = await Metrics.findOne({ startupId: id }).sort({ period: -1 });
            const latestScore = await VitalityScore.findOne({ startupId: id }).sort({ period: -1 });
            const allMetrics = await Metrics.find({ startupId: id }).sort({ period: 1 });
            const allScores = await VitalityScore.find({ startupId: id }).sort({ period: 1 });

            return {
                startup: startup.toObject(),
                latestMetrics,
                latestScore,
                metricsHistory: allMetrics,
                scoreHistory: allScores
            };
        }));

        res.json(comparisons.filter(Boolean));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
