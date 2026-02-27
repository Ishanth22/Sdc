import { Router, Response } from 'express';
import Benchmark from '../models/Benchmark';
import StartupProfile from '../models/StartupProfile';
import Metrics from '../models/Metrics';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/benchmark?metric=avgCac&sector=Fintech&stage=Seed
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const sector = (req.query.sector as string) || profile.sector;
        const stage = (req.query.stage as string) || profile.stage;

        // Get latest period with metrics
        const latestMetrics = await Metrics.findOne({ startupId: profile._id }).sort({ period: -1 });
        const period = (req.query.period as string) || latestMetrics?.period || '';

        if (!period) {
            return res.json({ benchmark: null, own: null, message: 'No metrics submitted yet' });
        }

        const benchmark = await Benchmark.findOne({ sector, stage, period });
        const ownMetrics = await Metrics.findOne({ startupId: profile._id, period });

        // Build comparison
        const metricKey = req.query.metric as string;
        if (metricKey && benchmark) {
            const bmValue = (benchmark.metrics as any)[metricKey];
            let ownValue: number | null = null;

            // Map benchmark keys to metric paths
            const metricMap: Record<string, string> = {
                avgRevenue: 'financial.revenue',
                avgBurnRate: 'financial.burnRate',
                avgRunway: 'financial.runwayMonths',
                avgCac: 'operational.cac',
                avgLtv: 'operational.ltv',
                avgActiveUsers: 'operational.activeUsers',
                avgRndSpend: 'innovation.rndSpend'
            };

            if (ownMetrics && metricMap[metricKey]) {
                const path = metricMap[metricKey].split('.');
                ownValue = (ownMetrics as any)[path[0]][path[1]];
            }

            return res.json({
                metric: metricKey,
                benchmarkValue: bmValue,
                ownValue,
                percentDiff: bmValue > 0 && ownValue !== null ? Math.round(((ownValue - bmValue) / bmValue) * 100) : null
            });
        }

        res.json({ benchmark: benchmark?.metrics || null, period });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
