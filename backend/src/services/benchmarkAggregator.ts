import Metrics from '../models/Metrics';
import Benchmark from '../models/Benchmark';
import StartupProfile from '../models/StartupProfile';

/**
 * Compute and store benchmark averages for all sector/stage combos for a given period.
 */
export async function computeBenchmarks(period: string): Promise<void> {
    const sectors = ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other'];
    const stages = ['Idea', 'Seed', 'Early', 'Growth'];

    for (const sector of sectors) {
        for (const stage of stages) {
            // Find all startups in this sector/stage
            const startups = await StartupProfile.find({ sector, stage });
            if (startups.length === 0) continue;

            const startupIds = startups.map(s => s._id);
            const metrics = await Metrics.find({ startupId: { $in: startupIds }, period });
            if (metrics.length === 0) continue;

            const n = metrics.length;
            const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / n;

            const benchmarkData = {
                avgRevenue: avg(metrics.map(m => m.financial.revenue)),
                avgBurnRate: avg(metrics.map(m => m.financial.burnRate)),
                avgRunway: avg(metrics.map(m => m.financial.runwayMonths)),
                avgCac: avg(metrics.map(m => m.operational.cac)),
                avgLtv: avg(metrics.map(m => m.operational.ltv)),
                avgActiveUsers: avg(metrics.map(m => m.operational.activeUsers)),
                avgChurnRate: avg(metrics.map(m => m.operational.churnRate || 0)),
                avgTeamSize: avg(startups.map(s => s.teamSize)),
                avgRndSpend: avg(metrics.map(m => m.innovation.rndSpend))
            };

            await Benchmark.findOneAndUpdate(
                { sector, stage, period },
                { metrics: benchmarkData },
                { upsert: true, new: true }
            );
        }
    }
}

/**
 * Get benchmark for a specific sector, stage, and optionally a specific metric.
 */
export async function getBenchmark(
    sector: string,
    stage: string,
    period: string,
    metricKey?: string
) {
    const bm = await Benchmark.findOne({ sector, stage, period });
    if (!bm) return null;
    if (metricKey && metricKey in bm.metrics) {
        return { [metricKey]: (bm.metrics as any)[metricKey] };
    }
    return bm.metrics;
}
