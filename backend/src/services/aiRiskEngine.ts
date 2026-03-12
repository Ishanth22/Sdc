import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import VitalityScore from '../models/VitalityScore';
import Benchmark from '../models/Benchmark';
import AnalysisCache from '../models/ForecastCache';
import mongoose from 'mongoose';
import { computeMetricsHash } from './forecasting';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'arcee-ai/trinity-large-preview:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── AI CALL WITH RETRY ────────────────────────────────────────────────

async function callAI(prompt: string, maxRetries = 2): Promise<string> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'VenturePulse AI Risk Engine'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2048,
                    temperature: 0.4
                })
            });

            if (response.ok) {
                const data: any = await response.json();
                return data.choices?.[0]?.message?.content || '';
            }

            if (response.status === 429 && attempt < maxRetries) {
                const delay = 2000 * Math.pow(2, attempt);
                console.log(`[AI Risk Engine] Rate limited. Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            return '';
        } catch (err) {
            console.error('[AI Risk Engine] API call failed:', err);
            if (attempt < maxRetries) continue;
            return '';
        }
    }
    return '';
}

// ─── AI RISK PREDICTION ENGINE ─────────────────────────────────────────

export interface AIRiskPrediction {
    overallRiskLevel: string;
    riskScore: number;
    predictions: {
        category: string;
        prediction: string;
        probability: 'low' | 'medium' | 'high';
        timeframe: string;
        impact: string;
    }[];
    trendAnalysis: string;
    actionItems: string[];
    aiInsights: string;
    isAIPowered: boolean;
}

export async function generateAIRiskPrediction(
    startupId: mongoose.Types.ObjectId | string
): Promise<AIRiskPrediction> {
    // ─── SMART CACHE CHECK ─────────────────────────────────────────────
    const allMetrics = await Metrics.find({ startupId }).sort({ period: 1 });
    const profile = await StartupProfile.findById(startupId);
    if (!profile) throw new Error('Startup not found');

    const currentDataHash = computeMetricsHash(allMetrics, profile, MODEL);

    try {
        const cached = await AnalysisCache.findOne({ startupId, cacheType: 'risk-prediction' });
        if (cached && cached.dataHash === currentDataHash) {
            console.log(`[AI Risk] Cache HIT — data unchanged, returning cached prediction`);
            return cached.result as AIRiskPrediction;
        }
        if (cached) {
            console.log(`[AI Risk] Cache STALE — data changed, regenerating`);
        } else {
            console.log(`[AI Risk] Cache MISS — generating first prediction`);
        }
    } catch (e) {
        console.error('[AI Risk] Cache lookup failed:', e);
    }

    const allScores = await VitalityScore.find({ startupId }).sort({ period: 1 });
    const benchmark = await Benchmark.findOne({ sector: profile.sector, stage: profile.stage })
        .sort({ period: -1 });

    if (allMetrics.length < 1) {
        return {
            overallRiskLevel: 'Unknown',
            riskScore: 0,
            predictions: [],
            trendAnalysis: 'Insufficient data for analysis.',
            actionItems: ['Submit your first month of metrics to enable AI risk prediction.'],
            aiInsights: '',
            isAIPowered: false
        };
    }

    // Build the data context for AI
    const metricsHistory = allMetrics.map(m => ({
        period: m.period,
        revenue: m.financial.revenue,
        burnRate: m.financial.burnRate,
        runway: m.financial.runwayMonths,
        totalFunding: m.financial.totalFunding,
        activeUsers: m.operational.activeUsers,
        newUsers: m.operational.newUsers,
        churnRate: m.operational.churnRate,
        cac: m.operational.cac,
        ltv: m.operational.ltv,
        rndSpend: m.innovation.rndSpend
    }));

    const scoreHistory = allScores.map(s => ({
        period: s.period,
        score: s.score,
        riskFlags: s.riskFlags
    }));

    // Rule-based risk metrics (baseline)
    const latest = allMetrics[allMetrics.length - 1];
    const prev = allMetrics.length >= 2 ? allMetrics[allMetrics.length - 2] : null;
    const prev2 = allMetrics.length >= 3 ? allMetrics[allMetrics.length - 3] : null;

    const ruleBasedFlags: string[] = [];
    let ruleBasedRiskScore = 0;

    if (latest.financial.runwayMonths > 0 && latest.financial.runwayMonths < 6) {
        ruleBasedFlags.push('Critical: Runway below 6 months');
        ruleBasedRiskScore += 25;
    } else if (latest.financial.runwayMonths > 0 && latest.financial.runwayMonths < 12) {
        ruleBasedFlags.push('Warning: Runway below 12 months');
        ruleBasedRiskScore += 10;
    }

    if (latest.operational.churnRate > 15) {
        ruleBasedFlags.push(`High churn rate: ${latest.operational.churnRate}%`);
        ruleBasedRiskScore += 15;
    }

    if (prev && prev.financial.revenue > 0) {
        const revGrowth = ((latest.financial.revenue - prev.financial.revenue) / prev.financial.revenue) * 100;
        if (revGrowth < -10) {
            ruleBasedFlags.push(`Revenue declining: ${revGrowth.toFixed(0)}% MoM`);
            ruleBasedRiskScore += 15;
        }
    }

    if (prev && prev2) {
        const g1 = prev.financial.revenue > 0 ? ((latest.financial.revenue - prev.financial.revenue) / prev.financial.revenue) * 100 : 0;
        const g2 = prev2.financial.revenue > 0 ? ((prev.financial.revenue - prev2.financial.revenue) / prev2.financial.revenue) * 100 : 0;
        if (g1 < 0 && g2 < 0) {
            ruleBasedFlags.push('Consecutive revenue decline (2+ months)');
            ruleBasedRiskScore += 20;
        }
    }

    if (prev && prev.financial.burnRate > 0) {
        const burnInc = ((latest.financial.burnRate - prev.financial.burnRate) / prev.financial.burnRate) * 100;
        if (burnInc > 30) {
            ruleBasedFlags.push(`Burn rate spiking: +${burnInc.toFixed(0)}% MoM`);
            ruleBasedRiskScore += 15;
        }
    }

    if (latest.operational.ltv > 0 && latest.operational.cac > 0 && latest.operational.ltv / latest.operational.cac < 3) {
        ruleBasedFlags.push(`Poor unit economics: LTV/CAC = ${(latest.operational.ltv / latest.operational.cac).toFixed(1)}x`);
        ruleBasedRiskScore += 10;
    }

    ruleBasedRiskScore = Math.min(100, ruleBasedRiskScore);

    // ─── AI ANALYSIS ────────────────────────────────────────────────────

    const aiPrompt = `You are an expert startup risk analyst and venture capital advisor. Analyze this startup's data and provide a risk prediction.

## STARTUP PROFILE
- Company: ${profile.companyName}
- Sector: ${profile.sector}
- Stage: ${profile.stage}
- City: ${profile.city}
- Team Size: ${profile.teamSize}

## METRICS HISTORY (chronological order)
${JSON.stringify(metricsHistory, null, 2)}

## HEALTH SCORE HISTORY
${JSON.stringify(scoreHistory, null, 2)}

## INDUSTRY BENCHMARK (${profile.sector} / ${profile.stage})
${benchmark ? JSON.stringify(benchmark.metrics, null, 2) : 'No benchmark data available'}

## CURRENT RULE-BASED RISK FLAGS
${ruleBasedFlags.length > 0 ? ruleBasedFlags.join('\n') : 'No critical flags detected'}

## YOUR TASK
Analyze the above data and respond in EXACTLY this JSON format (no extra text):

{
  "riskScore": <0-100 number, 100 = highest risk>,
  "overallRiskLevel": "<Critical/High/Moderate/Low>",
  "trendAnalysis": "<2-3 sentence analysis of overall trajectory and patterns>",
  "predictions": [
    {
      "category": "<Financial/Operational/Market/Team/Regulatory>",
      "prediction": "<specific prediction about what could happen>",
      "probability": "<low/medium/high>",
      "timeframe": "<e.g., 1-3 months, 3-6 months>",
      "impact": "<brief impact description>"
    }
  ],
  "actionItems": [
    "<specific, actionable recommendation 1>",
    "<specific, actionable recommendation 2>",
    "<specific, actionable recommendation 3>"
  ],
  "hiddenRisks": "<risks that aren't obvious from the raw numbers but emerge from patterns>"
}

Be specific and data-driven. Reference actual numbers from the metrics. Include at least 3 predictions and 3 action items.`;

    const aiResponse = await callAI(aiPrompt);

    let aiResult: any = null;
    let isAIPowered = false;

    if (aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0]);
                isAIPowered = true;
            }
        } catch (e) {
            console.error('[AI Risk Engine] Failed to parse AI response:', e);
        }
    }

    const result: AIRiskPrediction = {
        overallRiskLevel: aiResult?.overallRiskLevel || (
            ruleBasedRiskScore >= 60 ? 'Critical' :
                ruleBasedRiskScore >= 40 ? 'High' :
                    ruleBasedRiskScore >= 20 ? 'Moderate' : 'Low'
        ),
        riskScore: aiResult?.riskScore ?? ruleBasedRiskScore,
        predictions: aiResult?.predictions || ruleBasedFlags.map(flag => ({
            category: 'Financial',
            prediction: flag,
            probability: 'high' as const,
            timeframe: '1-3 months',
            impact: 'May affect runway and growth trajectory'
        })),
        trendAnalysis: aiResult?.trendAnalysis || generateRuleBasedTrend(allMetrics),
        actionItems: aiResult?.actionItems || generateRuleBasedActions(ruleBasedFlags, latest),
        aiInsights: aiResult?.hiddenRisks || '',
        isAIPowered
    };

    // ─── PERSIST TO CACHE ──────────────────────────────────────────────
    try {
        await AnalysisCache.findOneAndUpdate(
            { startupId, cacheType: 'risk-prediction' },
            {
                startupId,
                cacheType: 'risk-prediction',
                dataHash: currentDataHash,
                result,
                isAIPowered,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            { upsert: true, new: true }
        );
        console.log(`[AI Risk] Cached prediction (AI: ${isAIPowered})`);
    } catch (e) {
        console.error('[AI Risk] Failed to cache:', e);
    }

    return result;
}

// ─── AI BENCHMARKING ENGINE ────────────────────────────────────────────

export interface AIBenchmarkAnalysis {
    overallPosition: string;
    strengthAreas: { metric: string; insight: string; vsAvg: string }[];
    weaknessAreas: { metric: string; insight: string; vsAvg: string }[];
    peerComparison: string;
    recommendations: string[];
    competitiveEdge: string;
    aiInsights: string;
    isAIPowered: boolean;
}

export async function generateAIBenchmarkAnalysis(
    startupId: mongoose.Types.ObjectId | string
): Promise<AIBenchmarkAnalysis> {
    // ─── SMART CACHE CHECK ─────────────────────────────────────────────
    const allMetrics = await Metrics.find({ startupId }).sort({ period: 1 });
    const profile = await StartupProfile.findById(startupId);
    if (!profile) throw new Error('Startup not found');

    const currentDataHash = computeMetricsHash(allMetrics, profile, MODEL);

    try {
        const cached = await AnalysisCache.findOne({ startupId, cacheType: 'benchmark' });
        if (cached && cached.dataHash === currentDataHash) {
            console.log(`[AI Benchmark] Cache HIT — data unchanged, returning cached analysis`);
            return cached.result as AIBenchmarkAnalysis;
        }
        if (cached) {
            console.log(`[AI Benchmark] Cache STALE — data changed, regenerating`);
        } else {
            console.log(`[AI Benchmark] Cache MISS — generating first analysis`);
        }
    } catch (e) {
        console.error('[AI Benchmark] Cache lookup failed:', e);
    }

    const latestMetrics = await Metrics.findOne({ startupId }).sort({ period: -1 });
    if (!latestMetrics) throw new Error('No metrics found');

    const prevMetrics = await Metrics.findOne({
        startupId,
        period: { $lt: latestMetrics.period }
    }).sort({ period: -1 });

    // Get all startups in same sector for peer comparison
    const sectorStartups = await StartupProfile.find({ sector: profile.sector });
    const peerIds = sectorStartups.map(s => s._id);

    const peerMetrics = await Promise.all(peerIds.map(async id => {
        const m = await Metrics.findOne({ startupId: id }).sort({ period: -1 });
        const p = await StartupProfile.findById(id);
        return m ? { company: p?.companyName || 'Unknown', ...m.toObject() } : null;
    }));
    const validPeers = peerMetrics.filter(Boolean);

    const revenues = validPeers.map(p => p!.financial.revenue);
    const users = validPeers.map(p => p!.operational.activeUsers);
    const burns = validPeers.map(p => p!.financial.burnRate);
    const churns = validPeers.map(p => p!.operational.churnRate || 0);
    const runways = validPeers.map(p => p!.financial.runwayMonths);

    const calcPct = (vals: number[], own: number, lowerBetter = false) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const rank = lowerBetter ? sorted.filter(v => v > own).length : sorted.filter(v => v < own).length;
        return vals.length > 1 ? Math.round((rank / (sorted.length - 1)) * 100) : 50;
    };

    const percentiles = {
        revenue: calcPct(revenues, latestMetrics.financial.revenue),
        users: calcPct(users, latestMetrics.operational.activeUsers),
        burnRate: calcPct(burns, latestMetrics.financial.burnRate, true),
        churnRate: calcPct(churns, latestMetrics.operational.churnRate || 0, true),
        runway: calcPct(runways, latestMetrics.financial.runwayMonths)
    };

    const avgRevenue = revenues.length > 0 ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;
    const avgUsers = users.length > 0 ? users.reduce((a, b) => a + b, 0) / users.length : 0;
    const avgBurn = burns.length > 0 ? burns.reduce((a, b) => a + b, 0) / burns.length : 0;
    const avgChurn = churns.length > 0 ? churns.reduce((a, b) => a + b, 0) / churns.length : 0;

    // ─── AI ANALYSIS ────────────────────────────────────────────────────

    const aiPrompt = `You are an expert startup benchmarking analyst. Analyze this startup's position relative to its peers.

## STARTUP
- Company: ${profile.companyName}
- Sector: ${profile.sector}
- Stage: ${profile.stage}
- Team: ${profile.teamSize} employees

## CURRENT METRICS
- Revenue: ₹${latestMetrics.financial.revenue.toLocaleString()} (${percentiles.revenue}th percentile in sector)
- Active Users: ${latestMetrics.operational.activeUsers.toLocaleString()} (${percentiles.users}th percentile)
- Burn Rate: ₹${latestMetrics.financial.burnRate.toLocaleString()} (${percentiles.burnRate}th percentile, lower=better)
- Churn Rate: ${latestMetrics.operational.churnRate || 0}% (${percentiles.churnRate}th percentile, lower=better)
- Runway: ${latestMetrics.financial.runwayMonths} months (${percentiles.runway}th percentile)
- CAC: ₹${latestMetrics.operational.cac}
- LTV: ₹${latestMetrics.operational.ltv}
- LTV/CAC: ${latestMetrics.operational.cac > 0 ? (latestMetrics.operational.ltv / latestMetrics.operational.cac).toFixed(1) : 'N/A'}x

## SECTOR AVERAGES (${profile.sector})
- Avg Revenue: ₹${Math.round(avgRevenue).toLocaleString()}
- Avg Users: ${Math.round(avgUsers).toLocaleString()}
- Avg Burn Rate: ₹${Math.round(avgBurn).toLocaleString()}
- Avg Churn: ${avgChurn.toFixed(1)}%
- Total peers in sector: ${validPeers.length}

${prevMetrics ? `## MONTH-OVER-MONTH CHANGES
- Revenue: ${prevMetrics.financial.revenue > 0 ? ((latestMetrics.financial.revenue - prevMetrics.financial.revenue) / prevMetrics.financial.revenue * 100).toFixed(0) : 'N/A'}%
- Users: ${prevMetrics.operational.activeUsers > 0 ? ((latestMetrics.operational.activeUsers - prevMetrics.operational.activeUsers) / prevMetrics.operational.activeUsers * 100).toFixed(0) : 'N/A'}%
- Burn Rate: ${prevMetrics.financial.burnRate > 0 ? ((latestMetrics.financial.burnRate - prevMetrics.financial.burnRate) / prevMetrics.financial.burnRate * 100).toFixed(0) : 'N/A'}%` : ''}

## YOUR TASK
Respond in EXACTLY this JSON format:

{
  "overallPosition": "<e.g., Top 10%, Top Quartile, Above Average, Below Average, Bottom Quartile>",
  "strengths": [
    { "metric": "<metric name>", "insight": "<why this is strong>", "vsAvg": "<e.g., +45% above average>" }
  ],
  "weaknesses": [
    { "metric": "<metric name>", "insight": "<why this needs attention>", "vsAvg": "<e.g., -20% below average>" }
  ],
  "peerComparison": "<2-3 sentence comparison to sector peers>",
  "recommendations": [
    "<actionable recommendation to improve position>"
  ],
  "competitiveEdge": "<what sets this startup apart from peers>",
  "hiddenOpportunities": "<opportunities not obvious from raw metrics>"
}

Be specific with numbers. Reference percentiles and actual values.`;

    const aiResponse = await callAI(aiPrompt);

    let aiResult: any = null;
    let isAIPowered = false;

    if (aiResponse) {
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                aiResult = JSON.parse(jsonMatch[0]);
                isAIPowered = true;
            }
        } catch (e) {
            console.error('[AI Benchmark Engine] Failed to parse AI response:', e);
        }
    }

    // Build strengths/weaknesses from percentiles (rule-based fallback)
    const metricAnalysis = [
        { metric: 'Revenue', pct: percentiles.revenue, own: latestMetrics.financial.revenue, avg: avgRevenue, lowerBetter: false },
        { metric: 'Active Users', pct: percentiles.users, own: latestMetrics.operational.activeUsers, avg: avgUsers, lowerBetter: false },
        { metric: 'Burn Rate', pct: percentiles.burnRate, own: latestMetrics.financial.burnRate, avg: avgBurn, lowerBetter: true },
        { metric: 'Churn Rate', pct: percentiles.churnRate, own: latestMetrics.operational.churnRate || 0, avg: avgChurn, lowerBetter: true },
        { metric: 'Runway', pct: percentiles.runway, own: latestMetrics.financial.runwayMonths, avg: runways.reduce((a, b) => a + b, 0) / (runways.length || 1), lowerBetter: false }
    ];

    const ruleStrengths = metricAnalysis
        .filter(m => m.pct >= 60)
        .map(m => ({
            metric: m.metric,
            insight: `${m.pct}th percentile in ${profile.sector}`,
            vsAvg: m.avg > 0 ? `${m.lowerBetter ? '-' : '+'}${Math.abs(Math.round(((m.own - m.avg) / m.avg) * 100))}% vs avg` : 'N/A'
        }));

    const ruleWeaknesses = metricAnalysis
        .filter(m => m.pct < 40)
        .map(m => ({
            metric: m.metric,
            insight: `${m.pct}th percentile in ${profile.sector}`,
            vsAvg: m.avg > 0 ? `${m.lowerBetter ? '+' : '-'}${Math.abs(Math.round(((m.own - m.avg) / m.avg) * 100))}% vs avg` : 'N/A'
        }));

    const avgPct = Math.round((percentiles.revenue + percentiles.users + percentiles.burnRate + percentiles.churnRate + percentiles.runway) / 5);

    const result: AIBenchmarkAnalysis = {
        overallPosition: aiResult?.overallPosition || (
            avgPct >= 80 ? 'Top 20%' :
                avgPct >= 60 ? 'Above Average' :
                    avgPct >= 40 ? 'Average' :
                        avgPct >= 20 ? 'Below Average' : 'Bottom 20%'
        ),
        strengthAreas: aiResult?.strengths || ruleStrengths,
        weaknessAreas: aiResult?.weaknesses || ruleWeaknesses,
        peerComparison: aiResult?.peerComparison || `Out of ${validPeers.length} ${profile.sector} startups, ${profile.companyName} ranks in the ${avgPct}th percentile overall.`,
        recommendations: aiResult?.recommendations || generateBenchmarkRecs(percentiles, profile.sector),
        competitiveEdge: aiResult?.competitiveEdge || '',
        aiInsights: aiResult?.hiddenOpportunities || '',
        isAIPowered
    };

    // ─── PERSIST TO CACHE ──────────────────────────────────────────────
    try {
        await AnalysisCache.findOneAndUpdate(
            { startupId, cacheType: 'benchmark' },
            {
                startupId,
                cacheType: 'benchmark',
                dataHash: currentDataHash,
                result,
                isAIPowered,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            { upsert: true, new: true }
        );
        console.log(`[AI Benchmark] Cached analysis (AI: ${isAIPowered})`);
    } catch (e) {
        console.error('[AI Benchmark] Failed to cache:', e);
    }

    return result;
}

// ─── RULE-BASED FALLBACKS ──────────────────────────────────────────────

function generateRuleBasedTrend(metrics: any[]): string {
    if (metrics.length < 2) return 'Insufficient data for trend analysis.';

    const latest = metrics[metrics.length - 1];
    const prev = metrics[metrics.length - 2];
    const revGrowth = prev.financial.revenue > 0
        ? ((latest.financial.revenue - prev.financial.revenue) / prev.financial.revenue * 100).toFixed(0) : '0';
    const userGrowth = prev.operational.activeUsers > 0
        ? ((latest.operational.activeUsers - prev.operational.activeUsers) / prev.operational.activeUsers * 100).toFixed(0) : '0';

    return `Revenue ${Number(revGrowth) >= 0 ? 'grew' : 'declined'} ${Math.abs(Number(revGrowth))}% MoM. ` +
        `User base ${Number(userGrowth) >= 0 ? 'expanded' : 'contracted'} ${Math.abs(Number(userGrowth))}%. ` +
        `Runway is at ${latest.financial.runwayMonths} months with a burn rate of ₹${latest.financial.burnRate.toLocaleString()}/month.`;
}

function generateRuleBasedActions(flags: string[], latest: any): string[] {
    const actions: string[] = [];
    if (flags.some(f => f.includes('Runway'))) {
        actions.push('Begin fundraising immediately — runway is critically low.');
        actions.push('Implement a cost reduction plan to extend runway by 3-6 months.');
    }
    if (flags.some(f => f.includes('churn'))) {
        actions.push('Conduct customer exit interviews and implement a retention strategy.');
    }
    if (flags.some(f => f.includes('Revenue declining'))) {
        actions.push('Audit your sales pipeline and identify conversion bottlenecks.');
    }
    if (flags.some(f => f.includes('Burn rate'))) {
        actions.push('Review all expense categories and identify areas for 20%+ cost reduction.');
    }
    if (flags.some(f => f.includes('unit economics'))) {
        actions.push('Optimize CAC by focusing on organic/referral channels and increase LTV through upselling.');
    }
    if (actions.length === 0) {
        actions.push('Continue current growth trajectory — metrics look stable.');
        actions.push('Focus on scaling your strongest acquisition channel.');
        actions.push('Consider raising a growth round to capitalize on momentum.');
    }
    return actions;
}

function generateBenchmarkRecs(percentiles: any, sector: string): string[] {
    const recs: string[] = [];
    if (percentiles.revenue < 40) recs.push(`Your revenue is below ${sector} average — focus on sales acceleration and pricing optimization.`);
    if (percentiles.users < 40) recs.push('User growth is lagging peers — invest in growth marketing and referral programs.');
    if (percentiles.burnRate < 40) recs.push('Burn rate is higher than peers — audit expenses and look for operational efficiencies.');
    if (percentiles.churnRate < 40) recs.push('Churn is above sector average — prioritize customer success and onboarding improvements.');
    if (percentiles.runway < 40) recs.push('Runway is shorter than peers — start fundraising or reduce burn to extend runway.');
    if (recs.length === 0) {
        recs.push('Strong metrics across the board — consider raising a growth round at favorable terms.');
        recs.push(`You're outperforming most ${sector} peers — leverage this in investor conversations.`);
    }
    return recs;
}
