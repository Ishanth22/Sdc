import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import Metrics from '../models/Metrics';
import VitalityScore from '../models/VitalityScore';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/startups
router.get('/startups', async (req: AuthRequest, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sector = req.query.sector as string;
        const stage = req.query.stage as string;
        const search = req.query.search as string;

        const filter: any = {};
        if (sector) filter.sector = sector;
        if (stage) filter.stage = stage;
        if (search) filter.companyName = { $regex: search, $options: 'i' };

        const total = await StartupProfile.countDocuments(filter);
        const startups = await StartupProfile.find(filter)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Attach latest vitality score to each startup
        const enriched = await Promise.all(startups.map(async (s) => {
            const score = await VitalityScore.findOne({ startupId: s._id }).sort({ period: -1 });
            return {
                ...s.toObject(),
                latestScore: score?.score || 0,
                riskFlags: score?.riskFlags || []
            };
        }));

        res.json({ startups: enriched, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/startup/:id
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

// GET /api/admin/aggregates?by=sector
router.get('/aggregates', async (req: AuthRequest, res: Response) => {
    try {
        const groupBy = (req.query.by as string) || 'sector';
        const field = groupBy === 'stage' ? '$stage' : '$sector';

        const agg = await StartupProfile.aggregate([
            { $group: { _id: field, count: { $sum: 1 }, totalTeam: { $sum: '$teamSize' } } },
            { $sort: { count: -1 } }
        ]);

        // Get total funding and revenue from latest metrics
        const allStartups = await StartupProfile.find();
        let totalFunding = 0;
        let totalRevenue = 0;
        let totalJobs = 0;

        for (const s of allStartups) {
            const latest = await Metrics.findOne({ startupId: s._id }).sort({ period: -1 });
            if (latest) {
                totalFunding += latest.financial.fundingAmount;
                totalRevenue += latest.financial.revenue;
                totalJobs += latest.impact.directJobs;
            }
            totalJobs += s.teamSize || 0;
        }

        res.json({
            groupedBy: groupBy,
            groups: agg.map(g => ({ name: g._id, count: g.count, totalTeam: g.totalTeam })),
            totals: {
                startups: allStartups.length,
                funding: totalFunding,
                revenue: totalRevenue,
                jobs: totalJobs
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/admin/heatmap
router.get('/heatmap', async (_req: AuthRequest, res: Response) => {
    try {
        const cityAgg = await StartupProfile.aggregate([
            { $group: { _id: '$city', count: { $sum: 1 }, totalTeam: { $sum: '$teamSize' } } },
            { $sort: { count: -1 } }
        ]);

        res.json(cityAgg.map(c => ({ city: c._id, count: c.count, totalTeam: c.totalTeam })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
