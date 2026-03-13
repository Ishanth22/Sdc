import { Router, Response } from 'express';
import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateVitalityScore } from '../services/vitalityScore';
import { computeBenchmarks } from '../services/benchmarkAggregator';
import { invalidateAllCaches } from '../services/forecasting';
import { checkAndSendAlerts } from '../services/alertNotifier';

const router = Router();

// POST /api/metrics – submit or update metrics for a period
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found. Create one first.' });
        }

        const now = new Date();
        const period = req.body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Delete existing entry for this period then re-insert fresh
        // This guarantees all nested fields (financial, operational, etc.) are fully replaced
        await Metrics.deleteOne({ startupId: profile._id, period });

        const metrics = await Metrics.create({
            startupId: profile._id,
            period,
            financial:   req.body.financial   || {},
            operational: req.body.operational || {},
            innovation:  req.body.innovation  || {},
            impact:      req.body.impact      || {}
        });

        // Recompute benchmarks
        try { await computeBenchmarks(period); } catch (_) {}

        // Recalculate vitality score + alerts
        const scoreResult = await calculateVitalityScore(profile._id, period);

        // Invalidate AI caches
        await invalidateAllCaches(profile._id);

        // Check alert conditions and send email/SMS — fire-and-forget
        checkAndSendAlerts(profile._id, period).catch(e => console.error('[Alerts]', e.message));

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

// GET /api/metrics/period/:period – fetch metrics for a specific period
router.get('/period/:period', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const metrics = await Metrics.findOne({ startupId: profile._id, period: req.params.period });
        res.json(metrics || null);
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
