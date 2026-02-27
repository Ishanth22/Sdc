import Metrics, { IMetrics } from '../models/Metrics';
import VitalityScore from '../models/VitalityScore';
import StartupProfile from '../models/StartupProfile';
import Benchmark from '../models/Benchmark';
import mongoose from 'mongoose';

/**
 * Calculate Vitality Score for a startup based on its latest metrics.
 * Weights depend on startup stage:
 *   Idea/Seed: Operational 50%, Financial 20%, Innovation 20%, Impact 10%
 *   Early/Growth: Financial 40%, Operational 30%, Innovation 20%, Impact 10%
 */
export async function calculateVitalityScore(
    startupId: mongoose.Types.ObjectId | string,
    period: string
): Promise<{ score: number; components: any; riskFlags: string[] }> {
    const startup = await StartupProfile.findById(startupId);
    if (!startup) throw new Error('Startup not found');

    const metrics = await Metrics.findOne({ startupId, period });
    if (!metrics) throw new Error('Metrics not found for this period');

    // Get benchmark for comparison
    const benchmark = await Benchmark.findOne({ sector: startup.sector, stage: startup.stage, period });

    // Calculate component scores (0–100)
    const financialScore = calcFinancialScore(metrics, benchmark);
    const operationalScore = calcOperationalScore(metrics, benchmark);
    const innovationScore = calcInnovationScore(metrics, benchmark);
    const impactScore = calcImpactScore(metrics, benchmark);

    // Stage-based weights
    let weights: { financial: number; operational: number; innovation: number; impact: number };
    if (startup.stage === 'Idea' || startup.stage === 'Seed') {
        weights = { financial: 0.2, operational: 0.5, innovation: 0.2, impact: 0.1 };
    } else {
        weights = { financial: 0.4, operational: 0.3, innovation: 0.2, impact: 0.1 };
    }

    const score = Math.round(
        financialScore * weights.financial +
        operationalScore * weights.operational +
        innovationScore * weights.innovation +
        impactScore * weights.impact
    );

    // Risk flags
    const riskFlags: string[] = [];
    if (metrics.financial.runwayMonths > 0 && metrics.financial.runwayMonths < 6) {
        riskFlags.push('Low runway (< 6 months)');
    }
    if (benchmark && metrics.financial.burnRate > benchmark.metrics.avgBurnRate * 2) {
        riskFlags.push('High burn rate (> 2x industry average)');
    }
    if (metrics.operational.ltv > 0 && metrics.operational.cac > 0 &&
        metrics.operational.ltv / metrics.operational.cac < 3) {
        riskFlags.push('Poor unit economics (LTV/CAC < 3)');
    }

    // Check MoM revenue decline
    const prevPeriod = getPreviousPeriod(period);
    const prevMetrics = await Metrics.findOne({ startupId, period: prevPeriod });
    if (prevMetrics && prevMetrics.financial.revenue > 0) {
        const decline = (prevMetrics.financial.revenue - metrics.financial.revenue) / prevMetrics.financial.revenue;
        if (decline > 0.2) {
            riskFlags.push('Revenue dip (> 20% MoM decline)');
        }
    }

    const components = {
        financial: Math.round(financialScore),
        operational: Math.round(operationalScore),
        innovation: Math.round(innovationScore),
        impact: Math.round(impactScore)
    };

    // Upsert the score
    await VitalityScore.findOneAndUpdate(
        { startupId, period },
        { score: Math.min(100, Math.max(0, score)), components, riskFlags, createdAt: new Date() },
        { upsert: true, new: true }
    );

    return { score: Math.min(100, Math.max(0, score)), components, riskFlags };
}

function calcFinancialScore(m: IMetrics, bm: any): number {
    let score = 50; // baseline
    // Revenue growth signal
    if (m.financial.revenue > 0) score += 15;
    if (m.financial.revenue > 500000) score += 10;
    // Runway
    if (m.financial.runwayMonths >= 12) score += 15;
    else if (m.financial.runwayMonths >= 6) score += 5;
    else score -= 10;
    // Funding
    if (m.financial.fundingAmount > 0) score += 10;
    // Compare with benchmark
    if (bm && bm.metrics.avgRevenue > 0) {
        const ratio = m.financial.revenue / bm.metrics.avgRevenue;
        score += Math.min(15, (ratio - 1) * 20);
    }
    return Math.min(100, Math.max(0, score));
}

function calcOperationalScore(m: IMetrics, bm: any): number {
    let score = 40;
    if (m.operational.activeUsers > 0) score += 15;
    if (m.operational.activeUsers > 10000) score += 10;
    if (m.operational.newUsers > 0) score += 10;
    // CAC efficiency
    if (m.operational.cac > 0 && m.operational.ltv > 0) {
        const ratio = m.operational.ltv / m.operational.cac;
        if (ratio >= 5) score += 20;
        else if (ratio >= 3) score += 10;
        else score -= 5;
    }
    if (m.operational.citiesServed > 5) score += 5;
    return Math.min(100, Math.max(0, score));
}

function calcInnovationScore(m: IMetrics, _bm: any): number {
    let score = 30;
    score += Math.min(25, m.innovation.patentsFiled * 8);
    score += Math.min(20, m.innovation.patentsGranted * 15);
    score += Math.min(10, m.innovation.trademarksFiled * 5);
    if (m.innovation.rndSpend > 0) score += 15;
    return Math.min(100, Math.max(0, score));
}

function calcImpactScore(m: IMetrics, _bm: any): number {
    let score = 30;
    score += Math.min(20, m.impact.directJobs / 5);
    if (m.impact.womenEmployees > 0 && m.impact.directJobs > 0) {
        const ratio = m.impact.womenEmployees / m.impact.directJobs;
        if (ratio >= 0.4) score += 20;
        else if (ratio >= 0.25) score += 10;
    }
    if (m.impact.ruralEmployees > 0) score += 10;
    if (m.impact.exportsInr > 0) score += 15;
    return Math.min(100, Math.max(0, score));
}

function getPreviousPeriod(period: string): string {
    const [y, m] = period.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
}
