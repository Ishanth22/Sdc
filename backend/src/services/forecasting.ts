import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import AnalysisCache from '../models/ForecastCache';
import mongoose from 'mongoose';
import { createHash } from 'crypto';

// ─── AI CONFIG ─────────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'arcee-ai/trinity-large-preview:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── AI CALL WITH RETRY ────────────────────────────────────────────────

async function callAI(prompt: string, maxRetries = 2): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        console.log('[Forecasting AI] No API key set — using rule-based fallback');
        return '';
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Forecasting AI] Attempt ${attempt + 1}/${maxRetries + 1} — calling ${MODEL}...`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 90000); // 90s timeout

            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5000',
                    'X-Title': 'VenturePulse Forecasting Engine'
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 4096,
                    temperature: 0.6
                })
            });

            clearTimeout(timeout);

            if (response.ok) {
                const data: any = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                console.log(`[Forecasting AI] ✅ Got response (${content.length} chars)`);
                return content;
            }

            const errorBody = await response.text();
            console.error(`[Forecasting AI] ❌ HTTP ${response.status}: ${errorBody.substring(0, 200)}`);

            if (response.status === 429 && attempt < maxRetries) {
                const delay = 3000 * Math.pow(2, attempt);
                console.log(`[Forecasting AI] Rate limited. Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            return '';
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.error(`[Forecasting AI] ❌ Timed out after 90s on attempt ${attempt + 1}`);
            } else {
                console.error(`[Forecasting AI] ❌ API call failed:`, err.message);
            }
            if (attempt < maxRetries) continue;
            return '';
        }
    }
    return '';
}


// ─── DATA HASH UTILITY ─────────────────────────────────────────────────

export function computeMetricsHash(metrics: any[], profile: any, modelOverride?: string): string {
    const dataStr = JSON.stringify({
        model: modelOverride || MODEL,   // ← include model name so switching model auto-invalidates cache
        metrics: metrics.map(m => ({
            period: m.period,
            revenue: m.financial.revenue,
            expenses: m.financial.monthlyExpenses || m.financial.burnRate,
            burnRate: m.financial.burnRate,
            runway: m.financial.runwayMonths,
            totalFunding: m.financial.totalFunding,
            activeUsers: m.operational.activeUsers,
            newUsers: m.operational.newUsers,
            churnRate: m.operational.churnRate,
            cac: m.operational.cac,
            ltv: m.operational.ltv
        })),
        sector: profile?.sector,
        stage: profile?.stage
    });
    return createHash('sha256').update(dataStr).digest('hex');
}

// ─── CACHE INVALIDATION ───────────────────────────────────────────────

export async function invalidateAllCaches(startupId: mongoose.Types.ObjectId | string): Promise<void> {
    try {
        await AnalysisCache.deleteMany({ startupId });
        console.log(`[Cache] All caches invalidated for startup ${startupId} (forecast + risk + benchmark)`);
    } catch (e) {
        console.error('[Cache] Failed to invalidate caches:', e);
    }
}

// ─── INTERFACES ───────────────────────────────────────────────────────

export interface ForecastResult {
    currentRunway: number;
    projectedRunoutDate: string;
    projectedRunoutMonths: number;
    revenueForecasts: { period: string; value: number; type: 'actual' | 'forecast' }[];
    expenseForecasts: { period: string; value: number; type: 'actual' | 'forecast' }[];
    userForecasts: { period: string; value: number; type: 'actual' | 'forecast' }[];
    runwayForecasts: { period: string; value: number; type: 'actual' | 'forecast' }[];
    insights: string[];
    sectorContext: SectorContext;
    regulatoryRisks: RegulatoryRisk[];
    confidenceLevel: 'low' | 'medium' | 'high';
    aiInsights?: string;
    isAIPowered?: boolean;
    cachedAt?: string;
}

interface SectorContext {
    sector: string;
    stage: string;
    seasonalityFactor: number;
    growthCap: number;
    typicalGrowthRate: number;
    regulatoryBurden: 'low' | 'medium' | 'high';
}

interface RegulatoryRisk {
    regulation: string;
    impact: 'cost_increase' | 'revenue_restriction' | 'compliance_overhead' | 'opportunity' | 'funding_impact';
    severity: 'low' | 'medium' | 'high';
    estimatedImpactPercent: number;
    description: string;
    applicableSectors: string[];
}

// ─── SECTOR-SPECIFIC GROWTH PARAMETERS ─────────────────────────────────

const SECTOR_PROFILES: Record<string, {
    maxMonthlyGrowthRate: number;
    typicalGrowthRate: number;
    seasonalMonths: number[];
    seasonalBoost: number;
    complianceCostPercent: number;
    regulatoryBurden: 'low' | 'medium' | 'high';
}> = {
    Fintech: {
        maxMonthlyGrowthRate: 0.25,
        typicalGrowthRate: 0.12,
        seasonalMonths: [1, 3, 10, 11, 12],
        seasonalBoost: 15,
        complianceCostPercent: 8,
        regulatoryBurden: 'high'
    },
    Healthtech: {
        maxMonthlyGrowthRate: 0.20,
        typicalGrowthRate: 0.10,
        seasonalMonths: [7, 8, 9, 1, 2],
        seasonalBoost: 20,
        complianceCostPercent: 12,
        regulatoryBurden: 'high'
    },
    Edtech: {
        maxMonthlyGrowthRate: 0.30,
        typicalGrowthRate: 0.15,
        seasonalMonths: [4, 5, 6, 7],
        seasonalBoost: 25,
        complianceCostPercent: 3,
        regulatoryBurden: 'medium'
    },
    Ecommerce: {
        maxMonthlyGrowthRate: 0.35,
        typicalGrowthRate: 0.08,
        seasonalMonths: [10, 11, 12, 1],
        seasonalBoost: 40,
        complianceCostPercent: 5,
        regulatoryBurden: 'medium'
    },
    DeepTech: {
        maxMonthlyGrowthRate: 0.15,
        typicalGrowthRate: 0.06,
        seasonalMonths: [],
        seasonalBoost: 0,
        complianceCostPercent: 4,
        regulatoryBurden: 'low'
    },
    Agritech: {
        maxMonthlyGrowthRate: 0.20,
        typicalGrowthRate: 0.07,
        seasonalMonths: [6, 7, 10, 11],
        seasonalBoost: 30,
        complianceCostPercent: 3,
        regulatoryBurden: 'medium'
    },
    Logistics: {
        maxMonthlyGrowthRate: 0.18,
        typicalGrowthRate: 0.08,
        seasonalMonths: [10, 11, 12],
        seasonalBoost: 20,
        complianceCostPercent: 6,
        regulatoryBurden: 'medium'
    },
    CleanTech: {
        maxMonthlyGrowthRate: 0.15,
        typicalGrowthRate: 0.09,
        seasonalMonths: [3, 4],
        seasonalBoost: 15,
        complianceCostPercent: 5,
        regulatoryBurden: 'medium'
    },
    SaaS: {
        maxMonthlyGrowthRate: 0.30,
        typicalGrowthRate: 0.12,
        seasonalMonths: [1, 3, 12],
        seasonalBoost: 10,
        complianceCostPercent: 3,
        regulatoryBurden: 'low'
    },
    Other: {
        maxMonthlyGrowthRate: 0.20,
        typicalGrowthRate: 0.08,
        seasonalMonths: [],
        seasonalBoost: 0,
        complianceCostPercent: 4,
        regulatoryBurden: 'low'
    }
};

// ─── INDIAN REGULATORY RISKS DATABASE ──────────────────────────────────

const REGULATORY_RISKS: RegulatoryRisk[] = [
    {
        regulation: 'DPDP Act 2023 (Digital Personal Data Protection)',
        impact: 'compliance_overhead',
        severity: 'high',
        estimatedImpactPercent: 5,
        description: 'Data protection compliance requires consent management, data localization, and breach notification. Estimated 3-8% increase in operational costs.',
        applicableSectors: ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'SaaS']
    },
    {
        regulation: 'RBI Digital Lending Guidelines 2022',
        impact: 'revenue_restriction',
        severity: 'high',
        estimatedImpactPercent: 12,
        description: 'Restrictions on FLDG models, mandatory KYC, and fee disclosure. Direct impact on lending-based revenue models.',
        applicableSectors: ['Fintech']
    },
    {
        regulation: 'Angel Tax (Section 56(2)(viib))',
        impact: 'funding_impact',
        severity: 'medium',
        estimatedImpactPercent: 3,
        description: 'Tax on share premium above fair market value. Can complicate early-stage fundraising and increase legal costs.',
        applicableSectors: ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other']
    },
    {
        regulation: 'GST Rate Changes & Compliance',
        impact: 'cost_increase',
        severity: 'medium',
        estimatedImpactPercent: 4,
        description: 'Frequent GST rate revisions and filing requirements increase compliance costs. E-invoicing mandatory for B2B.',
        applicableSectors: ['Ecommerce', 'SaaS', 'Logistics']
    },
    {
        regulation: 'SEBI & IBBI Regulatory Framework',
        impact: 'compliance_overhead',
        severity: 'high',
        estimatedImpactPercent: 8,
        description: 'Investment platforms, trading apps, and wealth management face stringent SEBI compliance requirements.',
        applicableSectors: ['Fintech']
    },
    {
        regulation: 'CDSCO Medical Device / Drug Regulations',
        impact: 'revenue_restriction',
        severity: 'high',
        estimatedImpactPercent: 15,
        description: 'Medical device classification and drug approval processes can delay product launches by 6-18 months.',
        applicableSectors: ['Healthtech']
    },
    {
        regulation: 'NEP 2020 & AICTE Guidelines',
        impact: 'opportunity',
        severity: 'medium',
        estimatedImpactPercent: -10,
        description: 'National Education Policy creates opportunities for ed-tech platforms in skill development, online degrees, and credit transfer. Positive impact.',
        applicableSectors: ['Edtech']
    },
    {
        regulation: 'PLI (Production-Linked Incentive) Scheme',
        impact: 'opportunity',
        severity: 'medium',
        estimatedImpactPercent: -8,
        description: 'Government incentives for domestic manufacturing and deep tech innovation. Can offset costs by 8-15%. Positive impact.',
        applicableSectors: ['DeepTech', 'CleanTech']
    },
    {
        regulation: 'FDI Policy (Press Note 3 / Sectoral Caps)',
        impact: 'funding_impact',
        severity: 'medium',
        estimatedImpactPercent: 5,
        description: 'FDI restrictions in multi-brand retail, digital media, and insurance. Affects foreign funding availability in certain sectors.',
        applicableSectors: ['Ecommerce', 'Fintech', 'Healthtech']
    },
    {
        regulation: 'IT Act Intermediary Guidelines (MeitY)',
        impact: 'compliance_overhead',
        severity: 'medium',
        estimatedImpactPercent: 4,
        description: 'Content moderation, traceability requirements, and grievance officer mandates for social/content platforms.',
        applicableSectors: ['Edtech', 'Ecommerce', 'SaaS']
    },
    {
        regulation: 'Startup India 80-IAC Tax Benefit',
        impact: 'opportunity',
        severity: 'low',
        estimatedImpactPercent: -5,
        description: 'DPIIT-recognized startups can avail 3-year tax holiday. Reduces effective tax rate. Positive impact.',
        applicableSectors: ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other']
    },
    {
        regulation: 'ESOP Taxation (Budget 2024 Changes)',
        impact: 'cost_increase',
        severity: 'low',
        estimatedImpactPercent: 2,
        description: 'ESOP taxation rules affect talent retention costs. Tax deferral available for eligible startups.',
        applicableSectors: ['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other']
    }
];

// ─── AI-POWERED FULL FORECAST GENERATOR ────────────────────────────────

async function generateAIFullForecast(
    profile: any,
    metrics: any[],
    ruleBasedResult: ForecastResult,
    sectorProfile: typeof SECTOR_PROFILES[string],
    sector: string,
    stage: string
): Promise<ForecastResult | null> {
    if (!OPENROUTER_API_KEY) return null;

    const metricsHistory = metrics.map(m => ({
        period: m.period,
        revenue: m.financial.revenue,
        expenses: m.financial.monthlyExpenses || m.financial.burnRate,
        burnRate: m.financial.burnRate,
        runway: m.financial.runwayMonths,
        totalFunding: m.financial.totalFunding,
        activeUsers: m.operational.activeUsers,
        newUsers: m.operational.newUsers,
        churnRate: m.operational.churnRate,
        cac: m.operational.cac,
        ltv: m.operational.ltv
    }));

    const latestPeriod = metrics[metrics.length - 1].period;
    const [y, mo] = latestPeriod.split('-').map(Number);
    const futurePeriods = [];
    for (let i = 1; i <= 6; i++) {
        const d = new Date(y, mo - 1 + i, 1);
        futurePeriods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const ruleRevForecasts = ruleBasedResult.revenueForecasts.filter(f => f.type === 'forecast');
    const ruleExpForecasts = ruleBasedResult.expenseForecasts.filter(f => f.type === 'forecast');
    const ruleUserForecasts = ruleBasedResult.userForecasts.filter(f => f.type === 'forecast');

    const prompt = `You are an expert startup financial analyst and forecasting specialist for the Indian startup ecosystem. Your job is to generate INDEPENDENT, INTELLIGENT forecasts — NOT simple extrapolations.

## STARTUP PROFILE
- Company: ${profile.companyName}
- Sector: ${sector}
- Stage: ${stage}
- City: ${profile.city || 'India'}
- Team Size: ${profile.teamSize}
- Sector Avg Monthly Growth: ${(sectorProfile.typicalGrowthRate * 100).toFixed(0)}%
- Seasonal Boost Months: ${sectorProfile.seasonalMonths.length > 0 ? sectorProfile.seasonalMonths.join(', ') : 'None'} (+${sectorProfile.seasonalBoost}%)
- Regulatory Burden: ${sectorProfile.regulatoryBurden}

## HISTORICAL METRICS (chronological, ${metrics.length} months)
${JSON.stringify(metricsHistory, null, 2)}

## YOUR TASK
Analyze this startup's data like a seasoned VC analyst and generate a COMPLETE independent 6-month forecast. You MUST:
1. Identify the actual growth TREND and any inflection points (acceleration/deceleration)
2. Account for sector-specific seasonality and Indian market dynamics
3. Factor in regulatory impacts on ${sector} startups
4. Consider Stage-specific patterns (${stage} startups typically face specific challenges)
5. Look for warning signs or tailwinds hidden in the data (LTV/CAC ratio, churn trend, burn trajectory)
6. DO NOT just extrapolate linearly — provide a thoughtful, nuanced projection

The 6 forecast periods are: ${futurePeriods.join(', ')}

Respond in EXACTLY this JSON format (no markdown, no extra text):
{
  "revenueForecasts": [
    {"period": "${futurePeriods[0]}", "value": <integer>},
    {"period": "${futurePeriods[1]}", "value": <integer>},
    {"period": "${futurePeriods[2]}", "value": <integer>},
    {"period": "${futurePeriods[3]}", "value": <integer>},
    {"period": "${futurePeriods[4]}", "value": <integer>},
    {"period": "${futurePeriods[5]}", "value": <integer>}
  ],
  "expenseForecasts": [
    {"period": "${futurePeriods[0]}", "value": <integer>},
    {"period": "${futurePeriods[1]}", "value": <integer>},
    {"period": "${futurePeriods[2]}", "value": <integer>},
    {"period": "${futurePeriods[3]}", "value": <integer>},
    {"period": "${futurePeriods[4]}", "value": <integer>},
    {"period": "${futurePeriods[5]}", "value": <integer>}
  ],
  "userForecasts": [
    {"period": "${futurePeriods[0]}", "value": <integer>},
    {"period": "${futurePeriods[1]}", "value": <integer>},
    {"period": "${futurePeriods[2]}", "value": <integer>},
    {"period": "${futurePeriods[3]}", "value": <integer>},
    {"period": "${futurePeriods[4]}", "value": <integer>},
    {"period": "${futurePeriods[5]}", "value": <integer>}
  ],
  "projectedRunoutMonths": <integer>,
  "projectedRunoutDate": "<YYYY-MM>",
  "confidenceLevel": "<low|medium|high>",
  "insights": [
    "<insight 1 — specific, data-driven>",
    "<insight 2>",
    "<insight 3>",
    "<insight 4>",
    "<insight 5>"
  ],
  "overallOutlook": "<2-3 sentence strategic outlook based on patterns you see>",
  "criticalAction": "<single most important action this founder should take in the next 30 days>"
}

CRITICAL: Values MUST be realistic integers derived from YOUR analysis of the data. Do NOT use placeholder values. Show distinct revenue/expense curves that reflect the business dynamics — not straight-line extrapolation.`;

    try {
        console.log(`[Forecasting AI] Calling AI for full forecast of ${profile.companyName}...`);
        const aiResponse = await callAI(prompt);

        if (!aiResponse) {
            console.log('[Forecasting AI] No response from AI, using rule-based fallback');
            return null;
        }

        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('[Forecasting AI] Could not extract JSON from AI response');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate AI returned proper arrays with 6 entries each
        if (!parsed.revenueForecasts?.length || !parsed.expenseForecasts?.length || !parsed.userForecasts?.length) {
            console.log('[Forecasting AI] AI response missing forecast arrays');
            return null;
        }

        // Build AI-powered revenue forecasts
        const aiRevForecasts = parsed.revenueForecasts.map((f: any) => ({
            period: f.period,
            value: Math.max(0, Math.round(Number(f.value) || 0)),
            type: 'forecast' as const
        }));

        const aiExpForecasts = parsed.expenseForecasts.map((f: any) => ({
            period: f.period,
            value: Math.max(0, Math.round(Number(f.value) || 0)),
            type: 'forecast' as const
        }));

        const aiUserForecasts = parsed.userForecasts.map((f: any) => ({
            period: f.period,
            value: Math.max(0, Math.round(Number(f.value) || 0)),
            type: 'forecast' as const
        }));

        // Compute AI-based runway projections from AI's revenue/expense forecasts
        const latestMetrics = metrics[metrics.length - 1];
        const totalFunding = latestMetrics.financial.totalFunding || 0;
        let remainingCash = totalFunding > 0 ? totalFunding : ruleBasedResult.currentRunway * (latestMetrics.financial.burnRate || 1);

        const aiRunwayForecasts: { period: string; value: number; type: 'actual' | 'forecast' }[] = [
            ...metrics.map(m => ({ period: m.period, value: m.financial.runwayMonths, type: 'actual' as const }))
        ];

        let aiRunoutMonths = 0;
        let aiRunoutDate = '';

        for (let i = 0; i < 6; i++) {
            const projBurn = aiExpForecasts[i]?.value || latestMetrics.financial.burnRate;
            const projRev = aiRevForecasts[i]?.value || 0;
            const netBurn = Math.max(0, projBurn - projRev);
            remainingCash = Math.max(0, remainingCash - netBurn);
            const projRunway = projBurn > 0 ? Math.round(remainingCash / projBurn) : 99;
            aiRunwayForecasts.push({
                period: aiExpForecasts[i]?.period || `+${i + 1}M`,
                value: Math.max(0, projRunway),
                type: 'forecast'
            });

            if (remainingCash <= 0 && aiRunoutMonths === 0) {
                aiRunoutMonths = i + 1;
                aiRunoutDate = aiExpForecasts[i]?.period || '';
            }
        }

        if (aiRunoutMonths === 0) {
            aiRunoutMonths = parsed.projectedRunoutMonths || ruleBasedResult.projectedRunoutMonths;
            aiRunoutDate = parsed.projectedRunoutDate || ruleBasedResult.projectedRunoutDate;
        }

        // Build insights array from AI
        const aiInsightsList: string[] = parsed.insights || [];
        if (parsed.overallOutlook) {
            aiInsightsList.push(`📊 Outlook: ${parsed.overallOutlook}`);
        }
        if (parsed.criticalAction) {
            aiInsightsList.push(`🎯 Critical Action: ${parsed.criticalAction}`);
        }

        // Actual data + AI forecasts
        const revenues = metrics.map(m => ({ period: m.period, value: m.financial.revenue }));
        const expenses = metrics.map(m => ({ period: m.period, value: m.financial.monthlyExpenses || m.financial.burnRate }));
        const users = metrics.map(m => ({ period: m.period, value: m.operational.activeUsers }));

        const aiResult: ForecastResult = {
            currentRunway: ruleBasedResult.currentRunway,
            projectedRunoutDate: aiRunoutDate,
            projectedRunoutMonths: aiRunoutMonths,
            revenueForecasts: [
                ...revenues.map(r => ({ ...r, type: 'actual' as const })),
                ...aiRevForecasts
            ],
            expenseForecasts: [
                ...expenses.map(e => ({ ...e, type: 'actual' as const })),
                ...aiExpForecasts
            ],
            userForecasts: [
                ...users.map(u => ({ ...u, type: 'actual' as const })),
                ...aiUserForecasts
            ],
            runwayForecasts: aiRunwayForecasts,
            insights: aiInsightsList,
            sectorContext: ruleBasedResult.sectorContext,
            regulatoryRisks: ruleBasedResult.regulatoryRisks,
            confidenceLevel: parsed.confidenceLevel || ruleBasedResult.confidenceLevel,
            aiInsights: aiInsightsList.join('\n'),
            isAIPowered: true,
            cachedAt: new Date().toISOString()
        };

        console.log(`[Forecasting AI] Successfully generated AI forecast for ${profile.companyName}`);
        return aiResult;

    } catch (e: any) {
        console.error('[Forecasting AI] Failed to generate AI forecast:', e.message);
        return null;
    }
}

// ─── MAIN FORECASTING FUNCTION ─────────────────────────────────────────

/**
 * Generate 6-month forecasts using AI (primary) with rule-based fallback.
 * 
 * FLOW:
 * 1. Check MongoDB cache — if data hash matches, return cached result (0 API calls)
 * 2. Generate rule-based baseline forecast (math — always works)
 * 3. Call AI to generate full forecast with insights (replaces rule-based if successful)
 * 4. If AI fails, fall back to rule-based
 * 5. Cache result in MongoDB
 */
export async function generateForecasts(startupId: mongoose.Types.ObjectId | string): Promise<ForecastResult> {
    const metrics = await Metrics.find({ startupId }).sort({ period: 1 });
    const profile = await StartupProfile.findById(startupId) ||
        await StartupProfile.findOne({ userId: startupId });

    // ─── SMART CACHE CHECK ─────────────────────────────────────────────
    const currentDataHash = computeMetricsHash(metrics, profile);

    try {
        const cached = await AnalysisCache.findOne({ startupId, cacheType: 'forecast' });
        if (cached && cached.dataHash === currentDataHash) {
            console.log(`[Forecasting] Cache HIT — data unchanged, returning cached result`);
            return cached.result as ForecastResult;
        }
        if (cached) {
            console.log(`[Forecasting] Cache STALE — data changed, regenerating`);
        } else {
            console.log(`[Forecasting] Cache MISS — generating first forecast`);
        }
    } catch (e) {
        console.error('[Forecasting] Cache lookup failed:', e);
    }

    const sector = profile?.sector || 'Other';
    const stage = profile?.stage || 'Seed';
    const sectorProfile = SECTOR_PROFILES[sector] || SECTOR_PROFILES.Other;

    // Get applicable regulatory risks
    const applicableRisks = REGULATORY_RISKS.filter(r => r.applicableSectors.includes(sector));

    const regulatoryCostImpact = applicableRisks
        .filter(r => r.impact !== 'opportunity')
        .reduce((sum, r) => sum + r.estimatedImpactPercent, 0);

    const regulatoryBenefit = applicableRisks
        .filter(r => r.impact === 'opportunity')
        .reduce((sum, r) => sum + Math.abs(r.estimatedImpactPercent), 0);

    const confidenceLevel: 'low' | 'medium' | 'high' =
        metrics.length < 3 ? 'low' : metrics.length < 6 ? 'medium' : 'high';

    if (metrics.length < 2) {
        return {
            currentRunway: 0,
            projectedRunoutDate: 'Insufficient data',
            projectedRunoutMonths: 0,
            revenueForecasts: [],
            expenseForecasts: [],
            userForecasts: [],
            runwayForecasts: [],
            insights: ['Need at least 2 months of data for forecasting.'],
            sectorContext: {
                sector, stage, seasonalityFactor: 0,
                growthCap: sectorProfile.maxMonthlyGrowthRate * 100,
                typicalGrowthRate: sectorProfile.typicalGrowthRate * 100,
                regulatoryBurden: sectorProfile.regulatoryBurden
            },
            regulatoryRisks: applicableRisks,
            confidenceLevel: 'low'
        };
    }

    // ─── Step 1: Generate rule-based baseline (always works) ───────────
    const revenues = metrics.map(m => ({ period: m.period, value: m.financial.revenue }));
    const expenses = metrics.map(m => ({ period: m.period, value: m.financial.monthlyExpenses || m.financial.burnRate }));
    const users = metrics.map(m => ({ period: m.period, value: m.operational.activeUsers }));
    const runways = metrics.map(m => ({ period: m.period, value: m.financial.runwayMonths }));

    const latestMetrics = metrics[metrics.length - 1];
    const currentRunway = latestMetrics.financial.runwayMonths;
    const latestPeriod = latestMetrics.period;

    const revForecast = forecastSeriesSectorAware(revenues, 6, sectorProfile, latestPeriod);
    const expForecast = forecastSeriesSectorAware(expenses, 6, sectorProfile, latestPeriod);
    const userForecast = forecastSeriesSectorAware(users, 6, sectorProfile, latestPeriod);

    // Apply regulatory multipliers
    const regulatoryMultiplier = 1 + (regulatoryCostImpact / 100);
    for (const exp of expForecast) exp.value = Math.round(exp.value * regulatoryMultiplier);

    const benefitMultiplier = 1 + (regulatoryBenefit / 100);
    for (const rev of revForecast) rev.value = Math.round(rev.value * benefitMultiplier);

    // Runway projections
    const totalFunding = latestMetrics.financial.totalFunding || 0;
    let remainingCash = totalFunding > 0 ? totalFunding : currentRunway * (latestMetrics.financial.burnRate || 1);
    const runwayForecast: { period: string; value: number; type: 'actual' | 'forecast' }[] = [
        ...runways.map(r => ({ ...r, type: 'actual' as const }))
    ];

    let projectedRunoutMonths = 0;
    let projectedRunoutDate = '';

    for (let i = 0; i < 6; i++) {
        const projBurn = expForecast[i]?.value || latestMetrics.financial.burnRate;
        const projRev = revForecast[i]?.value || 0;
        const netBurn = Math.max(0, projBurn - projRev);
        remainingCash = Math.max(0, remainingCash - netBurn);
        const projRunway = projBurn > 0 ? Math.round(remainingCash / projBurn) : 99;
        runwayForecast.push({ period: expForecast[i]?.period || `+${i + 1}M`, value: Math.max(0, projRunway), type: 'forecast' });

        if (remainingCash <= 0 && projectedRunoutMonths === 0) {
            projectedRunoutMonths = i + 1;
            projectedRunoutDate = expForecast[i]?.period || '';
        }
    }

    if (projectedRunoutMonths === 0) {
        projectedRunoutMonths = currentRunway;
        const [y, m] = latestPeriod.split('-').map(Number);
        const runoutDate = new Date(y, m - 1 + currentRunway, 1);
        projectedRunoutDate = `${runoutDate.getFullYear()}-${String(runoutDate.getMonth() + 1).padStart(2, '0')}`;
    }

    // Build rule-based insights
    const insights: string[] = [];
    const revTrend = computeGrowthRate(revenues.map(r => r.value));
    const expTrend = computeGrowthRate(expenses.map(e => e.value));

    if (revTrend > sectorProfile.typicalGrowthRate * 100 * 1.5) {
        insights.push(`📈 Revenue growing at ~${revTrend.toFixed(0)}% monthly — above ${sector} average of ${(sectorProfile.typicalGrowthRate * 100).toFixed(0)}%.`);
    } else if (revTrend > 0) {
        insights.push(`→ Revenue growing at ~${revTrend.toFixed(1)}% monthly. ${sector} industry average: ${(sectorProfile.typicalGrowthRate * 100).toFixed(0)}%.`);
    } else {
        insights.push(`⚠️ Revenue declining at ~${Math.abs(revTrend).toFixed(1)}% monthly — below ${sector} norm.`);
    }
    if (expTrend > 15) insights.push(`⚠️ Expenses increasing at ~${expTrend.toFixed(0)}% monthly.`);
    insights.push(`Projected to run out of funds in ~${projectedRunoutMonths} months (${projectedRunoutDate}).`);
    if (projectedRunoutMonths <= 6) insights.push(`🔴 Critical: Start fundraising immediately — less than 6 months of runway projected.`);
    else if (projectedRunoutMonths <= 12) insights.push(`🟡 Begin fundraising preparation — 6-12 months of runway projected.`);

    const ruleBasedResult: ForecastResult = {
        currentRunway,
        projectedRunoutDate,
        projectedRunoutMonths,
        revenueForecasts: [
            ...revenues.map(r => ({ ...r, type: 'actual' as const })),
            ...revForecast
        ],
        expenseForecasts: [
            ...expenses.map(e => ({ ...e, type: 'actual' as const })),
            ...expForecast
        ],
        userForecasts: [
            ...users.map(u => ({ ...u, type: 'actual' as const })),
            ...userForecast
        ],
        runwayForecasts: runwayForecast,
        insights,
        sectorContext: {
            sector, stage,
            seasonalityFactor: sectorProfile.seasonalBoost,
            growthCap: sectorProfile.maxMonthlyGrowthRate * 100,
            typicalGrowthRate: sectorProfile.typicalGrowthRate * 100,
            regulatoryBurden: sectorProfile.regulatoryBurden
        },
        regulatoryRisks: applicableRisks,
        confidenceLevel,
        isAIPowered: false,
        cachedAt: new Date().toISOString()
    };

    // ─── Step 2: Try AI-powered full forecast ─────────────────────────
    const aiResult = await generateAIFullForecast(
        profile, metrics, ruleBasedResult, sectorProfile, sector, stage
    );

    // Use AI result if successful, otherwise fall back to rule-based
    const finalResult = aiResult || ruleBasedResult;

    // ─── Step 3: Persist to MongoDB cache ─────────────────────────────
    try {
        await AnalysisCache.findOneAndUpdate(
            { startupId, cacheType: 'forecast' },
            {
                startupId,
                cacheType: 'forecast',
                dataHash: currentDataHash,
                result: finalResult,
                isAIPowered: finalResult.isAIPowered || false,
                generatedAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            },
            { upsert: true, new: true }
        );
        console.log(`[Forecasting] Cached result (AI: ${finalResult.isAIPowered || false})`);
    } catch (e) {
        console.error('[Forecasting] Failed to cache:', e);
    }

    return finalResult;
}

// ─── SECTOR-AWARE FORECAST FUNCTION (rule-based fallback) ──────────────

function forecastSeriesSectorAware(
    data: { period: string; value: number }[],
    months: number,
    sectorProfile: typeof SECTOR_PROFILES[string],
    latestPeriod: string
): { period: string; value: number; type: 'forecast' }[] {
    if (data.length < 2) return [];

    const rates: number[] = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i - 1].value > 0) {
            rates.push((data[i].value - data[i - 1].value) / data[i - 1].value);
        }
    }

    let weightedRate = 0;
    let totalWeight = 0;
    for (let i = 0; i < rates.length; i++) {
        const weight = Math.pow(2, i);
        weightedRate += rates[i] * weight;
        totalWeight += weight;
    }
    let avgRate = totalWeight > 0 ? weightedRate / totalWeight : 0;

    avgRate = Math.min(avgRate, sectorProfile.maxMonthlyGrowthRate);
    avgRate = Math.max(avgRate, -sectorProfile.maxMonthlyGrowthRate);

    const values = data.map((d, i) => ({ x: i, y: d.value }));
    const n = values.length;
    const sumX = values.reduce((a, v) => a + v.x, 0);
    const sumY = values.reduce((a, v) => a + v.y, 0);
    const sumXY = values.reduce((a, v) => a + v.x * v.y, 0);
    const sumX2 = values.reduce((a, v) => a + v.x * v.x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;

    const lastValue = data[data.length - 1].value;
    const forecasts: { period: string; value: number; type: 'forecast' }[] = [];

    for (let i = 1; i <= months; i++) {
        const growthForecast = lastValue * Math.pow(1 + avgRate, i);
        const linearForecast = lastValue + slope * i;
        let blended = (growthForecast * 0.6 + linearForecast * 0.4);

        const [y, m] = latestPeriod.split('-').map(Number);
        const forecastDate = new Date(y, m - 1 + i, 1);
        const forecastMonth = forecastDate.getMonth() + 1;

        if (sectorProfile.seasonalMonths.includes(forecastMonth)) {
            blended *= (1 + sectorProfile.seasonalBoost / 100);
        }

        const period = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
        forecasts.push({ period, value: Math.max(0, Math.round(blended)), type: 'forecast' });
    }

    return forecasts;
}

function computeGrowthRate(values: number[]): number {
    if (values.length < 2) return 0;
    const rates: number[] = [];
    for (let i = 1; i < values.length; i++) {
        if (values[i - 1] > 0) {
            rates.push(((values[i] - values[i - 1]) / values[i - 1]) * 100);
        }
    }
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
}

// ─── SCENARIO SIMULATION ──────────────────────────────────────────────

export async function simulateScenario(
    startupId: mongoose.Types.ObjectId | string,
    adjustments: {
        revenueChangePercent?: number;
        expenseChangePercent?: number;
        additionalFunding?: number;
        churnChangePercent?: number;
    }
): Promise<{
    current: any;
    simulated: any;
    comparison: { metric: string; current: number; simulated: number; change: string }[];
}> {
    const latest = await Metrics.findOne({ startupId }).sort({ period: -1 });
    if (!latest) throw new Error('No metrics found');

    const {
        revenueChangePercent = 0,
        expenseChangePercent = 0,
        additionalFunding = 0,
        churnChangePercent = 0
    } = adjustments;

    const curRevenue = latest.financial.revenue;
    const curExpenses = latest.financial.monthlyExpenses || latest.financial.burnRate;
    const curBurnRate = latest.financial.burnRate;
    const curRunway = latest.financial.runwayMonths;
    const curChurn = latest.operational.churnRate || 0;
    const curUsers = latest.operational.activeUsers;
    const totalFunding = (latest.financial.totalFunding || 0) + additionalFunding;

    const simRevenue = curRevenue * (1 + revenueChangePercent / 100);
    const simExpenses = curExpenses * (1 - expenseChangePercent / 100);
    const simBurnRate = Math.max(0, simExpenses - simRevenue);
    const simRunway = simBurnRate > 0 ? Math.round(totalFunding / simBurnRate) : 999;
    const simChurn = Math.max(0, curChurn * (1 - churnChangePercent / 100));
    const simUsers = curUsers * (1 + (churnChangePercent > 0 ? churnChangePercent / 200 : 0));

    let simScore = 50;
    const revGrowth = revenueChangePercent;
    if (revGrowth > 20) simScore += 15;
    else if (revGrowth > 5) simScore += 10;
    else if (revGrowth < -5) simScore -= 10;

    if (simRunway > 18) simScore += 15;
    else if (simRunway > 12) simScore += 10;
    else if (simRunway < 6) simScore -= 15;

    if (simBurnRate < curBurnRate) simScore += 10;
    if (simChurn < 5) simScore += 10;
    else if (simChurn > 15) simScore -= 10;

    simScore = Math.max(0, Math.min(100, simScore));

    let curScore = 50;
    if (curRunway > 18) curScore += 15;
    else if (curRunway > 12) curScore += 10;
    else if (curRunway < 6) curScore -= 15;
    if (curChurn < 5) curScore += 10;
    else if (curChurn > 15) curScore -= 10;
    curScore = Math.max(0, Math.min(100, curScore));

    const simRiskFlags: string[] = [];
    if (simRunway < 6) simRiskFlags.push('Low runway');
    if (simChurn > 20) simRiskFlags.push('High churn');
    if (simBurnRate > simRevenue * 2) simRiskFlags.push('High burn multiple');

    const simRiskLevel = simRiskFlags.length >= 3 ? 'Critical' : simRiskFlags.length >= 2 ? 'High' : simRiskFlags.length >= 1 ? 'Moderate' : 'Low';

    return {
        current: {
            revenue: curRevenue, expenses: curExpenses, burnRate: curBurnRate,
            runway: curRunway, churn: curChurn, users: curUsers,
            score: curScore, funding: latest.financial.totalFunding || 0
        },
        simulated: {
            revenue: Math.round(simRevenue), expenses: Math.round(simExpenses),
            burnRate: Math.round(simBurnRate), runway: simRunway,
            churn: parseFloat(simChurn.toFixed(1)), users: Math.round(simUsers),
            score: simScore, funding: totalFunding,
            riskLevel: simRiskLevel, riskFlags: simRiskFlags
        },
        comparison: [
            { metric: 'Revenue', current: curRevenue, simulated: Math.round(simRevenue), change: `${revenueChangePercent > 0 ? '+' : ''}${revenueChangePercent}%` },
            { metric: 'Expenses', current: curExpenses, simulated: Math.round(simExpenses), change: `${expenseChangePercent > 0 ? '-' : '+'}${Math.abs(expenseChangePercent)}%` },
            { metric: 'Burn Rate', current: curBurnRate, simulated: Math.round(simBurnRate), change: `${((simBurnRate - curBurnRate) / (curBurnRate || 1) * 100).toFixed(0)}%` },
            { metric: 'Runway', current: curRunway, simulated: simRunway, change: `${simRunway - curRunway > 0 ? '+' : ''}${simRunway - curRunway} months` },
            { metric: 'Churn Rate', current: curChurn, simulated: parseFloat(simChurn.toFixed(1)), change: `${churnChangePercent > 0 ? '-' : '+'}${Math.abs(churnChangePercent)}%` },
            { metric: 'Health Score', current: curScore, simulated: simScore, change: `${simScore - curScore > 0 ? '+' : ''}${simScore - curScore}` },
        ]
    };
}
