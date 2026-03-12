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

// GET /api/benchmark/percentile – performance percentile ranking
router.get('/percentile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const ownMetrics = await Metrics.findOne({ startupId: profile._id }).sort({ period: -1 });
        if (!ownMetrics) return res.json({ message: 'No metrics submitted yet', percentiles: null });

        // Get all startups in same sector
        const sectorStartups = await StartupProfile.find({ sector: profile.sector });
        const startupIds = sectorStartups.map(s => s._id);

        // Get latest metrics for each startup
        const allLatest = await Promise.all(startupIds.map(async id => {
            return Metrics.findOne({ startupId: id }).sort({ period: -1 });
        }));
        const validMetrics = allLatest.filter(Boolean);

        const calcPercentile = (values: number[], ownValue: number) => {
            const sorted = values.sort((a, b) => a - b);
            const rank = sorted.filter(v => v < ownValue).length;
            return validMetrics.length > 1 ? Math.round((rank / (sorted.length - 1)) * 100) : 50;
        };

        const calcPercentileLower = (values: number[], ownValue: number) => {
            // For metrics where lower is better (burn rate, churn)
            const sorted = values.sort((a, b) => a - b);
            const rank = sorted.filter(v => v > ownValue).length;
            return validMetrics.length > 1 ? Math.round((rank / (sorted.length - 1)) * 100) : 50;
        };

        const revenues = validMetrics.map(m => m!.financial.revenue);
        const users = validMetrics.map(m => m!.operational.activeUsers);
        const runways = validMetrics.map(m => m!.financial.runwayMonths);
        const burns = validMetrics.map(m => m!.financial.burnRate);
        const churns = validMetrics.map(m => m!.operational.churnRate || 0);

        const percentiles = {
            revenue: {
                value: ownMetrics.financial.revenue,
                percentile: calcPercentile(revenues, ownMetrics.financial.revenue),
                label: 'Revenue'
            },
            activeUsers: {
                value: ownMetrics.operational.activeUsers,
                percentile: calcPercentile(users, ownMetrics.operational.activeUsers),
                label: 'Active Users'
            },
            runway: {
                value: ownMetrics.financial.runwayMonths,
                percentile: calcPercentile(runways, ownMetrics.financial.runwayMonths),
                label: 'Runway'
            },
            burnRate: {
                value: ownMetrics.financial.burnRate,
                percentile: calcPercentileLower(burns, ownMetrics.financial.burnRate),
                label: 'Burn Rate (lower=better)'
            },
            churnRate: {
                value: ownMetrics.operational.churnRate || 0,
                percentile: calcPercentileLower(churns, ownMetrics.operational.churnRate || 0),
                label: 'Churn Rate (lower=better)'
            }
        };

        const overallPercentile = Math.round(
            (percentiles.revenue.percentile + percentiles.activeUsers.percentile +
                percentiles.runway.percentile + percentiles.burnRate.percentile +
                percentiles.churnRate.percentile) / 5
        );

        res.json({
            sector: profile.sector,
            totalInSector: validMetrics.length,
            overallPercentile,
            percentiles
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

