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


// ─── SCENARIO SIMULATION ENGINE ────────────────────────────────────────

export interface ScenarioInput {
    scenarioType: 'hire' | 'marketing' | 'funding' | 'expansion' | 'custom';
    // Hire employees
    numEmployees?: number;
    avgMonthlySalary?: number;
    // Marketing
    extraMarketingBudget?: number;
    expectedUserGrowthPercent?: number;
    // Funding
    fundingAmount?: number;
    // Expansion
    numCities?: number;
    setupCostPerCity?: number;
    revenuePerCityPerMonth?: number;
    // Custom (legacy)
    revenueChangePercent?: number;
    expenseChangePercent?: number;
    additionalFunding?: number;
    churnChangePercent?: number;
}

function projectMonths(
    base: { revenue: number; expenses: number; cash: number; users: number; churn: number },
    monthlyDeltas: Array<{ revDelta: number; expDelta: number; cashDelta: number; userDelta: number }>,
    months = 12
): Array<{ month: number; revenue: number; expenses: number; burnRate: number; runway: number; users: number; profit: number }> {
    const result = [];
    let rev = base.revenue, exp = base.expenses, cash = base.cash, users = base.users;

    for (let i = 0; i < months; i++) {
        const d = monthlyDeltas[i] || monthlyDeltas[monthlyDeltas.length - 1];
        rev  = Math.max(0, rev  + d.revDelta);
        exp  = Math.max(0, exp  + d.expDelta);
        cash = Math.max(0, cash + d.cashDelta + rev - exp);
        users = Math.max(0, users + d.userDelta);
        const burnRate = Math.max(0, exp - rev);
        const runway = burnRate > 0 ? Math.round(cash / burnRate) : (cash > 0 ? 999 : 0);
        result.push({ month: i + 1, revenue: Math.round(rev), expenses: Math.round(exp), burnRate: Math.round(burnRate), runway, users: Math.round(users), profit: Math.round(rev - exp) });
    }
    return result;
}

export async function simulateScenario(
    startupId: mongoose.Types.ObjectId | string,
    input: ScenarioInput
): Promise<{
    scenario: string;
    summary: string;
    current: any;
    simulated: any;
    monthlyProjection: any[];
    comparison: { metric: string; current: number | string; simulated: number | string; change: string; better: boolean }[];
    insights: string[];
    breakEvenMonth: number | null;
    riskDelta: number;
}> {
    const latest = await Metrics.findOne({ startupId }).sort({ period: -1 });
    if (!latest) throw new Error('No metrics found. Submit at least one month of metrics first.');

    const curRevenue  = latest.financial.revenue || 0;
    const curExp      = latest.financial.monthlyExpenses || latest.financial.burnRate || 0;
    const curBurn     = Math.max(0, curExp - curRevenue);
    const curCash     = latest.financial.cashOnHand || (latest.financial.runwayMonths * curBurn) || 0;
    const curRunway   = curBurn > 0 ? Math.round(curCash / curBurn) : (curCash > 0 ? 999 : 0);
    const curChurn    = latest.operational.churnRate || 0;
    const curUsers    = latest.operational.activeUsers || 0;
    const curCAC      = latest.operational.cac || 1000;
    const arpu        = curUsers > 0 ? curRevenue / curUsers : 0;

    const base = { revenue: curRevenue, expenses: curExp, cash: curCash, users: curUsers, churn: curChurn };

    // Risk score helper
    const riskScore = (burn: number, runway: number, churn: number) => {
        let s = 0;
        if (runway < 3)  s += 40; else if (runway < 6) s += 25; else if (runway < 12) s += 10;
        if (burn > curRevenue * 2) s += 20; else if (burn > curRevenue) s += 10;
        if (churn > 15) s += 20; else if (churn > 8) s += 10;
        return Math.min(100, s);
    };

    let monthlyDeltas: Array<{ revDelta: number; expDelta: number; cashDelta: number; userDelta: number }> = [];
    let scenarioLabel = '';
    let summary = '';

    // ── 1. HIRE EMPLOYEES ──────────────────────────────────────────────
    if (input.scenarioType === 'hire') {
        const n       = input.numEmployees || 5;
        const salary  = input.avgMonthlySalary || 60000;
        const overhead = 0.25; // PF + insurance + equipment
        const monthlyCost = n * salary * (1 + overhead);
        // Revenue ramp: each employee contributes ~0.5x salary in revenue after 3-month ramp
        const revenuePerEmpAtFullRamp = salary * 0.5;
        scenarioLabel = `Hire ${n} Employee${n > 1 ? 's' : ''}`;
        summary = `Adding ${n} employees at ₹${(salary/1000).toFixed(0)}K/mo avg salary (+25% overhead). Revenue ramp-up takes 3 months.`;

        monthlyDeltas = Array.from({ length: 12 }, (_, i) => {
            const rampFactor = i < 1 ? 0 : i < 2 ? 0.2 : i < 3 ? 0.5 : 1.0;
            return {
                revDelta: (revenuePerEmpAtFullRamp * n * rampFactor) / 12,
                expDelta: i === 0 ? monthlyCost : 0, // one-time step-up
                cashDelta: 0,
                userDelta: Math.round(n * rampFactor * 2) // support staff helps retention
            };
        });
    }

    // ── 2. MARKETING CAMPAIGN ──────────────────────────────────────────
    else if (input.scenarioType === 'marketing') {
        const budget  = input.extraMarketingBudget || 200000;
        const growthP = (input.expectedUserGrowthPercent || 20) / 100;
        const newUsersPerMonth = Math.round((budget / curCAC) * 0.7); // 70% efficiency
        scenarioLabel = 'Increase Marketing Budget';
        summary = `Extra ₹${(budget/100000).toFixed(1)}L/month in marketing. Estimated ~${newUsersPerMonth} new users/month starting month 2.`;

        monthlyDeltas = Array.from({ length: 12 }, (_, i) => ({
            revDelta: i < 2 ? 0 : newUsersPerMonth * arpu * 0.6, // 2-month lag
            expDelta: i === 0 ? budget : 0,
            cashDelta: 0,
            userDelta: i < 1 ? 0 : newUsersPerMonth
        }));
    }

    // ── 3. RAISE FUNDING ───────────────────────────────────────────────
    else if (input.scenarioType === 'funding') {
        const raise = input.fundingAmount || 5000000;
        const legalCost = Math.round(raise * 0.015); // ~1.5% deal costs
        scenarioLabel = `Raise ₹${(raise / 100000).toFixed(0)}L Funding`;
        summary = `Injecting ₹${(raise/100000).toFixed(1)}L. After ~1.5% deal costs (₹${(legalCost/1000).toFixed(0)}K), runway extends significantly.`;

        monthlyDeltas = Array.from({ length: 12 }, (_, i) => ({
            revDelta: 0,
            expDelta: i === 0 ? legalCost / 3 : i === 1 ? legalCost / 3 : i === 2 ? legalCost / 3 : 0,
            cashDelta: i === 0 ? raise - legalCost : 0,
            userDelta: 0
        }));
    }

    // ── 4. EXPAND TO NEW MARKETS ───────────────────────────────────────
    else if (input.scenarioType === 'expansion') {
        const cities     = input.numCities || 3;
        const setupCost  = (input.setupCostPerCity || 500000) * cities;
        const opsCost    = cities * 150000; // monthly ops per city
        const cityRev    = (input.revenuePerCityPerMonth || 200000) * cities;
        scenarioLabel = `Expand to ${cities} New Cit${cities > 1 ? 'ies' : 'y'}`;
        summary = `Setup cost: ₹${(setupCost/100000).toFixed(1)}L. Monthly ops: +₹${(opsCost/1000).toFixed(0)}K. Revenue kicks in from month 3.`;

        monthlyDeltas = Array.from({ length: 12 }, (_, i) => ({
            revDelta: i < 3 ? 0 : cityRev / 12, // revenue ramp after 3 months
            expDelta: i === 0 ? opsCost : 0, // step-up in ops cost
            cashDelta: i === 0 ? -setupCost : 0, // one-time setup spend
            userDelta: i < 3 ? 0 : Math.round(cityRev / (arpu || 500))
        }));
    }

    // ── 5. CUSTOM (legacy sliders) ─────────────────────────────────────
    else {
        const revP  = (input.revenueChangePercent || 0) / 100;
        const expP  = (input.expenseChangePercent  || 0) / 100;
        const fund  = input.additionalFunding       || 0;
        const churP = (input.churnChangePercent     || 0) / 100;
        scenarioLabel = 'Custom Scenario';
        summary = `Revenue ${revP > 0 ? '+' : ''}${(revP*100).toFixed(0)}%, Expenses -${(expP*100).toFixed(0)}%, Funding +₹${(fund/100000).toFixed(1)}L, Churn -${(churP*100).toFixed(0)}%`;

        const revDelta1  = curRevenue * revP;
        const expDelta1  = -curExp * expP;
        const userDelta1 = Math.round(curUsers * churP * 0.1);
        monthlyDeltas = Array.from({ length: 12 }, (_, i) => ({
            revDelta: i === 0 ? revDelta1 : 0,
            expDelta: i === 0 ? expDelta1 : 0,
            cashDelta: i === 0 ? fund : 0,
            userDelta: i === 0 ? userDelta1 : 0
        }));
    }

    // Run 12-month projection
    const projection = projectMonths(base, monthlyDeltas, 12);
    const finalMonth = projection[11];

    // Break-even: month when cumulative profit turns positive
    let cumProfit = -(monthlyDeltas[0]?.cashDelta < 0 ? -monthlyDeltas[0].cashDelta : 0); // upfront cost
    let breakEvenMonth: number | null = null;
    for (const m of projection) {
        cumProfit += m.profit - (base.revenue - base.expenses);
        if (cumProfit >= 0 && breakEvenMonth === null) breakEvenMonth = m.month;
    }

    // Final simulated state
    const simRevenue = finalMonth.revenue;
    const simExp     = finalMonth.expenses;
    const simBurn    = finalMonth.burnRate;
    const simRunway  = finalMonth.runway;
    const simUsers   = finalMonth.users;
    const simProfit  = finalMonth.profit;

    const curRisk = riskScore(curBurn, curRunway, curChurn);
    const simRisk = riskScore(simBurn, simRunway, curChurn);

    const riskLabel = (r: number) => r < 20 ? 'Low' : r < 40 ? 'Moderate' : r < 65 ? 'High' : 'Critical';
    const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

    const insights: string[] = [];
    if (simRunway > curRunway + 6) insights.push(`✅ Runway improves by ${simRunway - curRunway} months — significantly safer financial position.`);
    else if (simRunway < curRunway - 3) insights.push(`⚠️ Runway reduces by ${curRunway - simRunway} months — monitor cash closely.`);
    if (simRevenue > curRevenue * 1.2) insights.push(`📈 Revenue grows ${Math.round(((simRevenue - curRevenue) / curRevenue) * 100)}% over 12 months.`);
    if (simProfit > 0 && curRevenue < curExp) insights.push(`🎉 Scenario could make the startup profitable! Monthly profit: ${fmt(simProfit)}`);
    if (simBurn > curBurn * 1.5) insights.push(`🔴 Burn rate increases significantly — ensure revenue catches up within 3 months.`);
    if (breakEvenMonth !== null) insights.push(`💰 Investment break-even estimated at month ${breakEvenMonth}.`);
    else insights.push(`📊 Investment does not break even within 12 months — review before committing.`);
    if (simUsers > curUsers * 1.1) insights.push(`👥 User base grows from ${curUsers.toLocaleString()} → ${simUsers.toLocaleString()} over 12 months.`);

    const chg = (cur: number, sim: number, fmt2?: (n: number) => string) => {
        const d = sim - cur;
        const pct = cur > 0 ? ((d / cur) * 100).toFixed(0) : '—';
        const sign = d >= 0 ? '+' : '';
        return fmt2 ? `${sign}${fmt2(d)}` : `${sign}${pct}%`;
    };

    return {
        scenario: scenarioLabel,
        summary,
        current: { revenue: curRevenue, expenses: curExp, burnRate: curBurn, runway: curRunway, users: curUsers, riskScore: curRisk, riskLevel: riskLabel(curRisk), profit: curRevenue - curExp },
        simulated: { revenue: simRevenue, expenses: simExp, burnRate: simBurn, runway: simRunway, users: simUsers, riskScore: simRisk, riskLevel: riskLabel(simRisk), profit: simProfit },
        monthlyProjection: projection,
        comparison: [
            { metric: 'Revenue/Month',    current: fmt(curRevenue), simulated: fmt(simRevenue), change: chg(curRevenue, simRevenue),    better: simRevenue > curRevenue },
            { metric: 'Expenses/Month',   current: fmt(curExp),     simulated: fmt(simExp),     change: chg(curExp, simExp),            better: simExp <= curExp },
            { metric: 'Burn Rate',        current: fmt(curBurn),    simulated: fmt(simBurn),    change: chg(curBurn, simBurn),          better: simBurn < curBurn },
            { metric: 'Runway (months)',  current: curRunway === 999 ? '∞' : String(curRunway), simulated: simRunway === 999 ? '∞' : String(simRunway), change: simRunway === 999 ? '+∞' : `${simRunway - curRunway > 0 ? '+' : ''}${simRunway - curRunway} mo`, better: simRunway >= curRunway },
            { metric: 'Active Users',     current: curUsers.toLocaleString(), simulated: simUsers.toLocaleString(), change: chg(curUsers, simUsers), better: simUsers > curUsers },
            { metric: 'Profitability',    current: fmt(curRevenue - curExp), simulated: fmt(simProfit), change: chg(curRevenue - curExp, simProfit, fmt), better: simProfit > curRevenue - curExp },
            { metric: 'Risk Level',       current: riskLabel(curRisk), simulated: riskLabel(simRisk), change: simRisk < curRisk ? `↓ ${curRisk - simRisk}pts` : simRisk > curRisk ? `↑ ${simRisk - curRisk}pts` : '—', better: simRisk <= curRisk },
        ],
        insights,
        breakEvenMonth,
        riskDelta: curRisk - simRisk
    };
}
