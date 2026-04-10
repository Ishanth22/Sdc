import { Router, Response } from 'express';
import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateVitalityScore } from '../services/vitalityScore';
import { computeBenchmarks } from '../services/benchmarkAggregator';
import { invalidateAllCaches } from '../services/forecasting';
import { checkAndSendAlerts } from '../services/alertNotifier';

const router = Router();

// POST /metrics — Submit or update a month's metrics
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found. Create one first.' });
        }

        const now = new Date();
        const period = req.body.period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Delete existing record for this period (upsert pattern)
        await Metrics.deleteOne({ startupId: profile._id, period });

        const metrics = await Metrics.create({
            startupId: profile._id,
            period,
            financial:   req.body.financial   || {},
            operational: req.body.operational || {},
            innovation:  req.body.innovation  || {},
            impact:      req.body.impact      || {}
        });

        // Compute benchmarks
        try { await computeBenchmarks(period); } catch (_) {}

        // Recalculate score for the submitted period
        const scoreResult = await calculateVitalityScore(profile._id, period);

        // IMPORTANT: Also recalculate score for the LATEST period so the Dashboard
        // always shows a fresh health score — even when an older historical month was edited.
        // Without this, editing Feb data when the latest period is Mar would leave Mar's score stale.
        const latestMetrics = await Metrics.findOne({ startupId: profile._id }).sort({ period: -1 });
        if (latestMetrics && latestMetrics.period !== period) {
            try { await calculateVitalityScore(profile._id, latestMetrics.period); } catch (_) {}
        }

        // Invalidate all forecast / risk / benchmark caches so new data is reflected
        await invalidateAllCaches(profile._id);

        // Fire-and-forget alert notifications
        checkAndSendAlerts(profile._id, period).catch(e => console.error('[Alerts]', e.message));

        res.status(201).json({ metrics, vitalityScore: scoreResult });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /metrics/history — All metrics sorted latest-first
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

        const metricsData = await Metrics.find(query).sort({ period: -1 });
        res.json(metricsData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /metrics/period/:period — Metrics for a specific period
router.get('/period/:period', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const metricsData = await Metrics.findOne({ startupId: profile._id, period: req.params.period });
        res.json(metricsData || null);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /metrics/latest — Most recent metrics entry
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
