import { Router, Response } from 'express';
import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateVitalityScore } from '../services/vitalityScore';
import { computeBenchmarks } from '../services/benchmarkAggregator';
import { invalidateAllCaches } from '../services/forecasting';

const router = Router();

// POST /api/metrics – submit metrics for current period
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found. Create one first.' });
        }

        // Use provided period or auto-generate current month
        const now = new Date();
        const period = req.body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const metricsData = {
            startupId: profile._id,
            period,
            financial: req.body.financial || {},
            operational: req.body.operational || {},
            innovation: req.body.innovation || {},
            impact: req.body.impact || {}
        };

        // Upsert metrics for this period
        const metrics = await Metrics.findOneAndUpdate(
            { startupId: profile._id, period },
            metricsData,
            { upsert: true, new: true, runValidators: true }
        );

        // Recompute benchmarks for this period
        try {
            await computeBenchmarks(period);
        } catch (e) {
            // Non-blocking; benchmarks may not exist yet
        }

        // Recalculate vitality score
        const scoreResult = await calculateVitalityScore(profile._id, period);

        // Invalidate ALL analysis caches — data changed, next page visit will regenerate
        await invalidateAllCaches(profile._id);

        res.status(201).json({ metrics, vitalityScore: scoreResult });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/metrics/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const { from, to } = req.query;
        const query: any = { startupId: profile._id };
        if (from || to) {
            query.period = {};
            if (from) query.period.$gte = from;
            if (to) query.period.$lte = to;
        }

        const metrics = await Metrics.find(query).sort({ period: -1 });
        res.json(metrics);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/metrics/latest
router.get('/latest', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const latest = await Metrics.findOne({ startupId: profile._id }).sort({ period: -1 });
        res.json(latest);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
