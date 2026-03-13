import Metrics, { IMetrics } from '../models/Metrics';
import VitalityScore from '../models/VitalityScore';
import StartupProfile from '../models/StartupProfile';
import Benchmark from '../models/Benchmark';
import Alert from '../models/Alert';
import mongoose from 'mongoose';

/**
 * Calculate Vitality/Health Score for a startup based on its latest metrics.
 * 
 * Health Score weights (matches requirements):
 * - Revenue Growth (25%)
 * - User Growth (20%)
 * - Burn Efficiency (20%)
 * - Churn Stability (15%)
 * - Runway Stability (20%)
 */
export async function calculateVitalityScore(
    startupId: mongoose.Types.ObjectId | string,
    period: string
): Promise<{ score: number; components: any; riskFlags: string[]; riskLevel: string; explanation: string[]; fundingReadiness: number }> {
    const startup = await StartupProfile.findById(startupId);
    if (!startup) throw new Error('Startup not found');

    const metrics = await Metrics.findOne({ startupId, period });
    if (!metrics) throw new Error('Metrics not found for this period');

    // Get benchmark for comparison
    const benchmark = await Benchmark.findOne({ sector: startup.sector, stage: startup.stage, period });

    // Get previous period metrics for growth calculations
    const prevPeriod = getPreviousPeriod(period);
    const prevMetrics = await Metrics.findOne({ startupId, period: prevPeriod });

    // Get 2 months back for trend analysis
    const prev2Period = getPreviousPeriod(prevPeriod);
    const prev2Metrics = await Metrics.findOne({ startupId, period: prev2Period });

    // ---- COMPONENT SCORES (0-100) ----

    // 1. Revenue Growth Score (25%)
    const revenueGrowthScore = calcRevenueGrowthScore(metrics, prevMetrics, benchmark);

    // 2. User Growth Score (20%)
    const userGrowthScore = calcUserGrowthScore(metrics, prevMetrics, benchmark);

    // 3. Burn Efficiency Score (20%)
    const burnEfficiencyScore = calcBurnEfficiencyScore(metrics, benchmark);

    // 4. Churn Stability Score (15%)
    const churnStabilityScore = calcChurnStabilityScore(metrics, prevMetrics);

    // 5. Runway Stability Score (20%)
    const runwayStabilityScore = calcRunwayStabilityScore(metrics);

    // Weighted Health Score
    const score = Math.round(
        revenueGrowthScore * 0.25 +
        userGrowthScore * 0.20 +
        burnEfficiencyScore * 0.20 +
        churnStabilityScore * 0.15 +
        runwayStabilityScore * 0.20
    );

    // ---- RISK FLAGS & RISK LEVEL ----
    const riskFlags: string[] = [];
    let riskPoints = 0;

    // Runway < 6 months
    if (metrics.financial.runwayMonths > 0 && metrics.financial.runwayMonths < 6) {
        riskFlags.push('Low runway (< 6 months)');
        riskPoints += 3;
    }

    // Churn > 15%
    if (metrics.operational.churnRate > 15) {
        riskFlags.push(`High churn rate (${metrics.operational.churnRate}%)`);
        riskPoints += 2;
    }

    // Revenue growth negative 2+ months
    if (prevMetrics && prev2Metrics) {
        const growthCurrent = prevMetrics.financial.revenue > 0
            ? ((metrics.financial.revenue - prevMetrics.financial.revenue) / prevMetrics.financial.revenue) * 100 : 0;
        const growthPrev = prev2Metrics.financial.revenue > 0
            ? ((prevMetrics.financial.revenue - prev2Metrics.financial.revenue) / prev2Metrics.financial.revenue) * 100 : 0;
        if (growthCurrent < 0 && growthPrev < 0) {
            riskFlags.push('Revenue declining for 2+ consecutive months');
            riskPoints += 3;
        }
    }

    // Burn rate increasing rapidly
    if (prevMetrics && prevMetrics.financial.burnRate > 0) {
        const burnIncrease = ((metrics.financial.burnRate - prevMetrics.financial.burnRate) / prevMetrics.financial.burnRate) * 100;
        if (burnIncrease > 30) {
            riskFlags.push(`Burn rate spiking (+${burnIncrease.toFixed(0)}% MoM)`);
            riskPoints += 2;
        }
    }

    // Revenue drop > 10%
    if (prevMetrics && prevMetrics.financial.revenue > 0) {
        const revDrop = ((prevMetrics.financial.revenue - metrics.financial.revenue) / prevMetrics.financial.revenue) * 100;
        if (revDrop > 10) {
            riskFlags.push(`Revenue dropped ${revDrop.toFixed(0)}% from last month`);
            riskPoints += 2;
        }
    }

    // High burn rate vs industry
    if (benchmark && metrics.financial.burnRate > benchmark.metrics.avgBurnRate * 2) {
        riskFlags.push('High burn rate (> 2x industry average)');
        riskPoints += 1;
    }

    // Poor unit economics
    if (metrics.operational.ltv > 0 && metrics.operational.cac > 0 &&
        metrics.operational.ltv / metrics.operational.cac < 3) {
        riskFlags.push('Poor unit economics (LTV/CAC < 3)');
        riskPoints += 1;
    }

    // ---- RISK LEVEL ----
    let riskLevel: string;
    if (riskPoints >= 7) riskLevel = 'Critical';
    else if (riskPoints >= 4) riskLevel = 'High';
    else if (riskPoints >= 2) riskLevel = 'Moderate';
    else riskLevel = 'Low';

    // ---- SCORE EXPLANATION ----
    const explanation: string[] = [];
    if (revenueGrowthScore >= 70) explanation.push('Strong revenue growth is boosting your score significantly.');
    else if (revenueGrowthScore < 40) explanation.push('Low or negative revenue growth is dragging your score down.');

    if (userGrowthScore >= 70) explanation.push('Healthy user acquisition momentum detected.');
    else if (userGrowthScore < 40) explanation.push('User growth stagnation is affecting your overall health.');

    if (burnEfficiencyScore >= 70) explanation.push('Efficient burn rate management is a positive signal.');
    else if (burnEfficiencyScore < 40) explanation.push('Burn rate is too high relative to revenue, hurting efficiency.');

    if (churnStabilityScore >= 70) explanation.push('Low churn indicates strong product-market fit.');
    else if (churnStabilityScore < 40) explanation.push('High churn rate suggests customer retention issues.');

    if (runwayStabilityScore >= 70) explanation.push('Comfortable runway gives stability to your operations.');
    else if (runwayStabilityScore < 40) explanation.push('Short runway is creating urgency — consider fundraising.');

    if (score >= 80) explanation.unshift('🟢 Excellent overall health — your startup is performing well across metrics.');
    else if (score >= 60) explanation.unshift('🟡 Good health with room for improvement in some areas.');
    else if (score >= 40) explanation.unshift('🟠 Moderate health — several metrics need attention.');
    else explanation.unshift('🔴 Your startup needs immediate attention in multiple areas.');

    // ---- FUNDING READINESS ----
    const fundingReadiness = calcFundingReadiness(metrics, prevMetrics, startup, riskLevel);

    const components = {
        financial: Math.round(revenueGrowthScore),
        operational: Math.round(userGrowthScore),
        innovation: Math.round(burnEfficiencyScore),
        impact: Math.round(churnStabilityScore),
        // Additional breakdown
        revenueGrowth: Math.round(revenueGrowthScore),
        userGrowth: Math.round(userGrowthScore),
        burnEfficiency: Math.round(burnEfficiencyScore),
        churnStability: Math.round(churnStabilityScore),
        runwayStability: Math.round(runwayStabilityScore),
    };

    const finalScore = Math.min(100, Math.max(0, score));

    // Delete existing score for this period and re-insert fresh
    await VitalityScore.deleteOne({ startupId, period });
    await VitalityScore.create({ startupId, period, score: finalScore, components, riskFlags });

    // Generate alerts
    await generateAlerts(startupId, period, riskFlags, riskLevel, metrics, prevMetrics);

    return { score: finalScore, components, riskFlags, riskLevel, explanation, fundingReadiness };
}

function calcRevenueGrowthScore(m: IMetrics, prev: IMetrics | null, bm: any): number {
    let score = 50;
    if (m.financial.revenue > 0) score += 10;
    if (m.financial.revenue > 500000) score += 10;
    if (m.financial.revenue > 2000000) score += 5;

    // Month-over-month growth
    if (prev && prev.financial.revenue > 0) {
        const growth = ((m.financial.revenue - prev.financial.revenue) / prev.financial.revenue) * 100;
        if (growth > 20) score += 20;
        else if (growth > 10) score += 15;
        else if (growth > 0) score += 5;
        else if (growth < -10) score -= 15;
        else if (growth < 0) score -= 5;
    }

    // vs benchmark
    if (bm && bm.metrics.avgRevenue > 0) {
        const ratio = m.financial.revenue / bm.metrics.avgRevenue;
        score += Math.min(10, Math.max(-10, (ratio - 1) * 15));
    }

    return Math.min(100, Math.max(0, score));
}

function calcUserGrowthScore(m: IMetrics, prev: IMetrics | null, bm: any): number {
    let score = 40;
    if (m.operational.activeUsers > 0) score += 15;
    if (m.operational.activeUsers > 10000) score += 10;
    if (m.operational.newUsers > 0) score += 10;

    // MoM user growth
    if (prev && prev.operational.activeUsers > 0) {
        const growth = ((m.operational.activeUsers - prev.operational.activeUsers) / prev.operational.activeUsers) * 100;
        if (growth > 15) score += 20;
        else if (growth > 5) score += 10;
        else if (growth < 0) score -= 10;
    }

    if (m.operational.citiesServed > 5) score += 5;

    return Math.min(100, Math.max(0, score));
}

function calcBurnEfficiencyScore(m: IMetrics, bm: any): number {
    let score = 50;

    // Revenue / Burn Rate ratio (higher is better)
    if (m.financial.burnRate > 0) {
        const ratio = m.financial.revenue / m.financial.burnRate;
        if (ratio >= 2) score += 25;
        else if (ratio >= 1) score += 15;
        else if (ratio >= 0.5) score += 5;
        else score -= 10;
    }

    // LTV/CAC ratio
    if (m.operational.cac > 0 && m.operational.ltv > 0) {
        const ltvCac = m.operational.ltv / m.operational.cac;
        if (ltvCac >= 5) score += 20;
        else if (ltvCac >= 3) score += 10;
        else score -= 5;
    }

    // vs benchmark burn rate
    if (bm && bm.metrics.avgBurnRate > 0) {
        const ratio = m.financial.burnRate / bm.metrics.avgBurnRate;
        if (ratio <= 0.7) score += 10;
        else if (ratio > 1.5) score -= 10;
    }

    return Math.min(100, Math.max(0, score));
}

function calcChurnStabilityScore(m: IMetrics, prev: IMetrics | null): number {
    let score = 70; // Start optimistic

    const churn = m.operational.churnRate || 0;
    if (churn <= 3) score += 20;
    else if (churn <= 5) score += 10;
    else if (churn <= 10) score -= 5;
    else if (churn <= 15) score -= 15;
    else score -= 30;

    // Churn increasing
    if (prev) {
        const prevChurn = prev.operational.churnRate || 0;
        if (churn > prevChurn + 3) score -= 15;
        else if (churn < prevChurn) score += 10;
    }

    return Math.min(100, Math.max(0, score));
}

function calcRunwayStabilityScore(m: IMetrics): number {
    const runway = m.financial.runwayMonths;
    if (runway >= 18) return 95;
    if (runway >= 12) return 80;
    if (runway >= 9) return 65;
    if (runway >= 6) return 50;
    if (runway >= 3) return 30;
    if (runway > 0) return 15;
    return 50; // Unknown runway
}

/**
 * Funding Readiness Score (0–100)
 * Based on: revenue consistency, growth rate, team size, market traction, risk level
 */
function calcFundingReadiness(m: IMetrics, prev: IMetrics | null, startup: any, riskLevel: string): number {
    let score = 0;

    // Revenue consistency (25%)
    if (m.financial.revenue > 0) score += 15;
    if (m.financial.revenue > 500000) score += 5;
    if (m.financial.revenue > 2000000) score += 5;

    // Growth rate (25%)
    if (prev && prev.financial.revenue > 0) {
        const growth = ((m.financial.revenue - prev.financial.revenue) / prev.financial.revenue) * 100;
        if (growth > 15) score += 25;
        else if (growth > 5) score += 15;
        else if (growth > 0) score += 8;
    }

    // Team size (15%)
    if (startup.teamSize >= 50) score += 15;
    else if (startup.teamSize >= 20) score += 10;
    else if (startup.teamSize >= 5) score += 5;

    // Market traction (20%)
    if (m.operational.activeUsers > 10000) score += 20;
    else if (m.operational.activeUsers > 1000) score += 12;
    else if (m.operational.activeUsers > 100) score += 5;

    // Risk level penalty (15%)
    if (riskLevel === 'Low') score += 15;
    else if (riskLevel === 'Moderate') score += 8;
    else if (riskLevel === 'High') score += 2;
    // Critical = 0

    return Math.min(100, Math.max(0, score));
}

/**
 * Generate smart alerts based on metric analysis
 */
async function generateAlerts(
    startupId: mongoose.Types.ObjectId | string,
    period: string,
    riskFlags: string[],
    riskLevel: string,
    metrics: IMetrics,
    prevMetrics: IMetrics | null
): Promise<void> {
    // Remove old alerts for this period to avoid duplicates
    await Alert.deleteMany({ startupId, period });

    const alerts: any[] = [];

    // Runway alert
    if (metrics.financial.runwayMonths > 0 && metrics.financial.runwayMonths < 6) {
        alerts.push({
            startupId, period,
            type: 'runway',
            severity: metrics.financial.runwayMonths < 3 ? 'critical' : 'warning',
            title: 'Low Runway Alert',
            message: `Your runway is only ${metrics.financial.runwayMonths} months. Consider reducing burn rate or seeking additional funding immediately.`
        });
    }

    // Burn rate spike
    if (prevMetrics && prevMetrics.financial.burnRate > 0) {
        const burnIncrease = ((metrics.financial.burnRate - prevMetrics.financial.burnRate) / prevMetrics.financial.burnRate) * 100;
        if (burnIncrease > 30) {
            alerts.push({
                startupId, period,
                type: 'burn_rate',
                severity: burnIncrease > 50 ? 'critical' : 'warning',
                title: 'Burn Rate Spike',
                message: `Your burn rate increased by ${burnIncrease.toFixed(0)}% compared to last month. Review expenses and operational costs.`
            });
        }
    }

    // Revenue drop
    if (prevMetrics && prevMetrics.financial.revenue > 0) {
        const revDrop = ((prevMetrics.financial.revenue - metrics.financial.revenue) / prevMetrics.financial.revenue) * 100;
        if (revDrop > 10) {
            alerts.push({
                startupId, period,
                type: 'revenue_drop',
                severity: revDrop > 25 ? 'critical' : 'warning',
                title: 'Revenue Decline',
                message: `Revenue dropped by ${revDrop.toFixed(0)}%. Analyze sales pipeline and customer retention strategies.`
            });
        }
    }

    // Churn spike
    if (metrics.operational.churnRate > 15) {
        alerts.push({
            startupId, period,
            type: 'churn_spike',
            severity: metrics.operational.churnRate > 25 ? 'critical' : 'warning',
            title: 'High Customer Churn',
            message: `Churn rate is at ${metrics.operational.churnRate}%. Focus on customer success and satisfaction to reduce attrition.`
        });
    }

    // Risk level alert
    if (riskLevel === 'High' || riskLevel === 'Critical') {
        alerts.push({
            startupId, period,
            type: 'risk_level',
            severity: riskLevel === 'Critical' ? 'critical' : 'warning',
            title: `${riskLevel} Risk Status`,
            message: `Your startup is flagged as ${riskLevel} risk. Issues: ${riskFlags.join('; ')}`
        });
    }

    if (alerts.length > 0) {
        await Alert.insertMany(alerts);
    }
}

function getPreviousPeriod(period: string): string {
    const [y, m] = period.split('-').map(Number);
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * AI Advisor: Rule-based suggestions
 */
export function getAIAdvice(metrics: IMetrics, prevMetrics: IMetrics | null, riskFlags: string[]): { question: string; answer: string }[] {
    const advice: { question: string; answer: string }[] = [];

    // Runway
    if (metrics.financial.runwayMonths > 0 && metrics.financial.runwayMonths < 9) {
        advice.push({
            question: "Why is my runway decreasing?",
            answer: `Your current runway is ${metrics.financial.runwayMonths} months. ${metrics.financial.burnRate > metrics.financial.revenue
                ? `Your burn rate (₹${metrics.financial.burnRate.toLocaleString()}) exceeds revenue (₹${metrics.financial.revenue.toLocaleString()}). Consider reducing non-essential expenses, renegotiating vendor contracts, or pursuing bridge funding to extend your runway.`
                : `While revenue covers burn rate, your total funding might be depleting. Look into Series fundraising or revenue-based financing.`
                }`
        });
    }

    // Churn
    if (metrics.operational.churnRate > 5) {
        advice.push({
            question: "How can I reduce churn?",
            answer: `Your churn rate is ${metrics.operational.churnRate}%. Strategies to reduce it: 1) Implement onboarding flows to improve activation. 2) Set up NPS surveys to identify pain points. 3) Create a customer success team for high-value accounts. 4) Consider loyalty programs or annual plans with discounts. 5) Analyze churned customer patterns for common exit triggers.`
        });
    }

    // CAC/LTV
    if (metrics.operational.cac > 0 && metrics.operational.ltv > 0 && metrics.operational.ltv / metrics.operational.cac < 3) {
        advice.push({
            question: "Why is my LTV/CAC ratio low?",
            answer: `Your LTV/CAC ratio is ${(metrics.operational.ltv / metrics.operational.cac).toFixed(1)}x (healthy target is 3x+). To improve: 1) Reduce CAC by focusing on organic channels (SEO, referrals). 2) Increase LTV through upselling, cross-selling, and reducing churn. 3) Optimize ad spend — focus on highest converting channels. 4) Build a referral program to reduce acquisition costs.`
        });
    }

    // Revenue
    if (prevMetrics && prevMetrics.financial.revenue > 0) {
        const growth = ((metrics.financial.revenue - prevMetrics.financial.revenue) / prevMetrics.financial.revenue) * 100;
        if (growth < 0) {
            advice.push({
                question: "Why is my revenue declining?",
                answer: `Revenue decreased by ${Math.abs(growth).toFixed(0)}% this month. Possible causes: 1) Seasonal trends — check if this pattern repeats. 2) Increased churn — current churn is ${metrics.operational.churnRate}%. 3) Pricing pressure — analyze competitive landscape. 4) Product issues — check support tickets and user feedback. 5) Focus on expansion revenue from existing customers.`
            });
        }
    }

    // Burn rate
    if (prevMetrics && prevMetrics.financial.burnRate > 0) {
        const burnIncrease = ((metrics.financial.burnRate - prevMetrics.financial.burnRate) / prevMetrics.financial.burnRate) * 100;
        if (burnIncrease > 20) {
            advice.push({
                question: "Why is my burn rate increasing?",
                answer: `Burn rate increased ${burnIncrease.toFixed(0)}% MoM. Review: 1) Recent hiring — ensure each hire has clear ROI targets. 2) Infrastructure costs — optimize cloud spending. 3) Marketing spend — measure CAC for each channel. 4) Office/overhead — consider remote-first model. 5) Set departmental budgets with monthly reviews.`
            });
        }
    }

    // General positive advice
    if (advice.length === 0) {
        advice.push({
            question: "How can I accelerate growth?",
            answer: "Your metrics look healthy! To accelerate: 1) Double down on your highest-ROI marketing channels. 2) Invest in product-led growth features. 3) Build strategic partnerships for distribution. 4) Consider geographic expansion. 5) Launch a referral program to leverage your existing user base."
        });
        advice.push({
            question: "When should I raise my next round?",
            answer: `With ${metrics.financial.runwayMonths} months of runway and ${metrics.operational.activeUsers.toLocaleString()} active users, ${metrics.financial.runwayMonths > 12
                ? "you have time to optimize metrics before raising. Focus on hitting 2x growth milestones to maximize valuation."
                : "consider starting fundraising conversations now. It typically takes 3-6 months to close a round."
                }`
        });
    }

    return advice;
}
