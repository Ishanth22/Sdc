import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import VitalityScore from '../models/VitalityScore';
import Milestone from '../models/Milestone';
import Alert from '../models/Alert';
import Benchmark from '../models/Benchmark';
import mongoose from 'mongoose';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'arcee-ai/trinity-large-preview:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2 seconds

/**
 * Call OpenRouter API with google/gemma-3-27b-it:free model.
 * Includes automatic retry with exponential backoff for 429 rate limit errors.
 * Note: Gemma 3 doesn't support system instructions, so we combine them into user message.
 */
async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5000',
                'X-Title': 'VenturePulse AI Advisor'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'user', content: combinedPrompt }
                ],
                max_tokens: 2048,
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data: any = await response.json();
            return data.choices?.[0]?.message?.content || '';
        }

        // Handle rate limiting with retry
        if (response.status === 429) {
            if (attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
                console.log(`[AI Advisor] Rate limited (429). Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            // All retries exhausted
            throw new Error(
                'The AI model is temporarily rate-limited on the free tier. ' +
                'Please wait 30-60 seconds and try again. ' +
                'Tip: Add your own OpenRouter API key at openrouter.ai/settings for higher limits.'
            );
        }

        // Handle other errors
        const errBody = await response.text();
        if (response.status === 400) {
            throw new Error('AI model request failed. The model may be temporarily unavailable. Please try again shortly.');
        }
        if (response.status === 401 || response.status === 403) {
            throw new Error('Invalid or missing OpenRouter API key. Please check your OPENROUTER_API_KEY in the .env file.');
        }
        throw new Error(`AI service error (${response.status}). Please try again later.`);
    }

    throw new Error('AI service temporarily unavailable. Please try again in a minute.');
}

/**
 * Gather ALL datasets for a startup and build a comprehensive context string.
 * This feeds the AI with full history so it can give data-driven answers.
 */
async function buildStartupContext(startupId: mongoose.Types.ObjectId | string): Promise<string> {
    // 1. Profile
    const profile = await StartupProfile.findById(startupId);
    if (!profile) throw new Error('Startup not found');

    // 2. All metrics history (sorted chronologically)
    const allMetrics = await Metrics.find({ startupId }).sort({ period: 1 });

    // 3. All vitality scores
    const allScores = await VitalityScore.find({ startupId }).sort({ period: 1 });

    // 4. Milestones
    const milestones = await Milestone.find({ startupId }).sort({ deadline: 1 });

    // 5. Active alerts
    const alerts = await Alert.find({ startupId, dismissed: false }).sort({ createdAt: -1 });

    // 6. Industry benchmarks (latest period)
    const latestPeriod = allMetrics.length > 0 ? allMetrics[allMetrics.length - 1].period : '';
    const benchmark = latestPeriod
        ? await Benchmark.findOne({ sector: profile.sector, stage: profile.stage, period: latestPeriod })
        : null;

    // Build context
    let context = `
=== STARTUP PROFILE ===
Company Name: ${profile.companyName}
Sector/Industry: ${profile.sector}
Stage: ${profile.stage}
City: ${profile.city}
Team Size: ${profile.teamSize}
Founded: ${profile.foundedDate ? new Date(profile.foundedDate).toISOString().split('T')[0] : 'Unknown'}
Description: ${profile.description || 'N/A'}
`;

    // Metrics history
    if (allMetrics.length > 0) {
        context += `\n=== MONTHLY METRICS HISTORY (${allMetrics.length} months) ===\n`;
        for (const m of allMetrics) {
            context += `
--- Period: ${m.period} ---
Financial: Revenue ₹${m.financial.revenue.toLocaleString('en-IN')}, Expenses ₹${(m.financial.monthlyExpenses || 0).toLocaleString('en-IN')}, Burn Rate ₹${m.financial.burnRate.toLocaleString('en-IN')}, Runway ${m.financial.runwayMonths} months, Total Funding ₹${(m.financial.totalFunding || 0).toLocaleString('en-IN')}
Operational: Active Users ${m.operational.activeUsers.toLocaleString('en-IN')}, New Users ${m.operational.newUsers.toLocaleString('en-IN')}, Churn Rate ${m.operational.churnRate || 0}%, CAC ₹${m.operational.cac.toLocaleString('en-IN')}, LTV ₹${m.operational.ltv.toLocaleString('en-IN')}, LTV/CAC ${m.operational.cac > 0 ? (m.operational.ltv / m.operational.cac).toFixed(2) : 'N/A'}
Innovation: R&D Spend ₹${m.innovation.rndSpend.toLocaleString('en-IN')}, Patents Filed ${m.innovation.patentsFiled}
Impact: Direct Jobs ${m.impact.directJobs}, Women Employees ${m.impact.womenEmployees}
`;
        }

        // Compute growth trends
        context += `\n=== GROWTH TRENDS ===\n`;
        for (let i = 1; i < allMetrics.length; i++) {
            const curr = allMetrics[i];
            const prev = allMetrics[i - 1];
            const revGrowth = prev.financial.revenue > 0
                ? (((curr.financial.revenue - prev.financial.revenue) / prev.financial.revenue) * 100).toFixed(1)
                : 'N/A';
            const userGrowth = prev.operational.activeUsers > 0
                ? (((curr.operational.activeUsers - prev.operational.activeUsers) / prev.operational.activeUsers) * 100).toFixed(1)
                : 'N/A';
            context += `${prev.period} → ${curr.period}: Revenue ${revGrowth}%, Users ${userGrowth}%\n`;
        }
    }

    // Vitality scores
    if (allScores.length > 0) {
        context += `\n=== HEALTH SCORE HISTORY ===\n`;
        for (const s of allScores) {
            const c = s.components as any;
            context += `${s.period}: Score ${s.score}/100 | RevGrowth: ${c.revenueGrowth || c.financial || 0} | UserGrowth: ${c.userGrowth || c.operational || 0} | BurnEff: ${c.burnEfficiency || c.innovation || 0} | ChurnStab: ${c.churnStability || c.impact || 0} | RunwayStab: ${c.runwayStability || 0}`;
            if (s.riskFlags.length > 0) context += ` | Risks: ${s.riskFlags.join(', ')}`;
            context += `\n`;
        }
    }

    // Milestones
    if (milestones.length > 0) {
        context += `\n=== MILESTONES ===\n`;
        for (const m of milestones) {
            const deadline = new Date(m.deadline).toISOString().split('T')[0];
            const isOverdue = !m.completed && new Date(m.deadline) < new Date();
            context += `- ${m.title} [${m.category}] | Due: ${deadline} | ${m.completionPercent}% | ${m.completed ? 'COMPLETED' : isOverdue ? 'OVERDUE' : 'IN PROGRESS'}\n`;
        }
    }

    // Alerts
    if (alerts.length > 0) {
        context += `\n=== ACTIVE ALERTS ===\n`;
        for (const a of alerts) {
            context += `- [${a.severity.toUpperCase()}] ${a.title}: ${a.message}\n`;
        }
    }

    // Benchmarks
    if (benchmark) {
        const bm = benchmark.metrics as any;
        context += `\n=== INDUSTRY BENCHMARKS (${profile.sector} / ${profile.stage}) ===\n`;
        context += `Avg Revenue: ₹${Math.round(bm.avgRevenue || 0).toLocaleString('en-IN')}, Avg Burn: ₹${Math.round(bm.avgBurnRate || 0).toLocaleString('en-IN')}, Avg Runway: ${Math.round(bm.avgRunway || 0)}mo, Avg CAC: ₹${Math.round(bm.avgCac || 0).toLocaleString('en-IN')}, Avg LTV: ₹${Math.round(bm.avgLtv || 0).toLocaleString('en-IN')}, Avg Users: ${Math.round(bm.avgActiveUsers || 0).toLocaleString('en-IN')}, Avg Churn: ${(bm.avgChurnRate || 0).toFixed(1)}%\n`;
    }

    return context;
}

/** System prompt for the AI advisor */
const SYSTEM_PROMPT = `You are VenturePulse AI Advisor — an expert startup strategy consultant with deep expertise in venture capital, startup operations, financial modeling, and growth strategy for the Indian startup ecosystem.

You have been given comprehensive real data about a specific startup: their complete profile, monthly financial & operational metrics history, health scores, milestones, alerts, and industry benchmarks.

Your job:
1. Analyze the data deeply — identify trends, anomalies, strengths, weaknesses
2. Give actionable, specific advice backed by the data (cite exact numbers)
3. Compare performance against industry benchmarks when relevant
4. Be honest about risks — don't sugarcoat
5. Use ₹ (INR) for money, give percentages and growth rates
6. Be concise but thorough — use bullet points`;

/**
 * Generate AI-powered auto recommendations based on all startup data.
 */
export async function generateAIRecommendations(
    startupId: mongoose.Types.ObjectId | string
): Promise<{ advice: { question: string; answer: string }[]; contextSummary: string }> {
    const context = await buildStartupContext(startupId);

    if (!OPENROUTER_API_KEY) {
        return { advice: getFallbackRecommendations(context), contextSummary: 'Using rule-based analysis (set OPENROUTER_API_KEY for AI-powered insights)' };
    }

    try {
        const userPrompt = `Here is the complete startup data:
${context}

Based on thorough analysis of ALL the above data, generate exactly 5 key insights and recommendations. For each, provide:
1. A short question/title (the concern or topic)
2. A detailed answer with specific data references, analysis, and actionable advice

Format your response STRICTLY as a JSON array with objects having "question" and "answer" keys. Example:
[{"question": "...", "answer": "..."}, ...]

Cover: financial health, growth momentum, key risks, improvement opportunities, funding strategy.
Return ONLY the JSON array, no markdown fences, no extra text.`;

        const text = await callOpenRouter(SYSTEM_PROMPT, userPrompt);

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const advice = JSON.parse(jsonMatch[0]);
            return { advice, contextSummary: `AI analysis powered by ${MODEL}` };
        }

        // If JSON parsing fails, try to split by numbered items
        console.warn('AI response was not valid JSON, using fallback');
        return { advice: getFallbackRecommendations(context), contextSummary: 'AI response format issue, using rule-based' };
    } catch (error: any) {
        console.error('OpenRouter API error:', error.message);
        return { advice: getFallbackRecommendations(context), contextSummary: `AI error: ${error.message}` };
    }
}

/**
 * Answer a custom question using AI with full startup data context.
 */
export async function askAIQuestion(
    startupId: mongoose.Types.ObjectId | string,
    question: string
): Promise<{ answer: string; dataPointsUsed: string[] }> {
    const context = await buildStartupContext(startupId);

    if (!OPENROUTER_API_KEY) {
        return {
            answer: getFallbackAnswer(question, context),
            dataPointsUsed: ['Rule-based analysis (set OPENROUTER_API_KEY for AI-powered responses)']
        };
    }

    try {
        const userPrompt = `Here is the complete startup data:
${context}

The founder is asking: "${question}"

Provide a detailed, data-driven answer. Reference specific numbers from the data. Give actionable advice with concrete steps. Use bullet points for clarity.`;

        const answer = await callOpenRouter(SYSTEM_PROMPT, userPrompt);

        // Extract some key data point mentions for the UI
        const dataPointsUsed: string[] = [];
        if (answer.includes('₹') || answer.includes('revenue') || answer.includes('Revenue')) dataPointsUsed.push('Financial metrics');
        if (answer.includes('user') || answer.includes('User') || answer.includes('churn')) dataPointsUsed.push('Operational metrics');
        if (answer.includes('score') || answer.includes('Score') || answer.includes('health')) dataPointsUsed.push('Health score history');
        if (answer.includes('benchmark') || answer.includes('industry') || answer.includes('average')) dataPointsUsed.push('Industry benchmarks');
        if (answer.includes('milestone') || answer.includes('Milestone')) dataPointsUsed.push('Milestone tracking');
        if (answer.includes('alert') || answer.includes('risk') || answer.includes('Risk')) dataPointsUsed.push('Risk alerts');
        if (dataPointsUsed.length === 0) dataPointsUsed.push('Full company data analyzed');

        return { answer: answer.trim(), dataPointsUsed };
    } catch (error: any) {
        console.error('OpenRouter API error:', error.message);
        return {
            answer: getFallbackAnswer(question, context),
            dataPointsUsed: [`AI error: ${error.message}`]
        };
    }
}

/**
 * Get a comprehensive data summary for the frontend context display.
 */
export async function getDataSummary(startupId: mongoose.Types.ObjectId | string): Promise<any> {
    const profile = await StartupProfile.findById(startupId);
    const latestMetrics = await Metrics.findOne({ startupId }).sort({ period: -1 });
    const latestScore = await VitalityScore.findOne({ startupId }).sort({ period: -1 });
    const metricsCount = await Metrics.countDocuments({ startupId });
    const milestoneCount = await Milestone.countDocuments({ startupId });
    const completedMilestones = await Milestone.countDocuments({ startupId, completed: true });
    const alertCount = await Alert.countDocuments({ startupId, dismissed: false });

    return {
        company: profile?.companyName || 'Unknown',
        sector: profile?.sector || 'Unknown',
        stage: profile?.stage || 'Unknown',
        period: latestMetrics?.period || 'N/A',
        score: latestScore?.score || 0,
        riskFlags: latestScore?.riskFlags || [],
        metricsMonths: metricsCount,
        milestones: `${completedMilestones}/${milestoneCount}`,
        activeAlerts: alertCount,
        aiPowered: !!OPENROUTER_API_KEY,
        model: OPENROUTER_API_KEY ? MODEL : 'rule-based'
    };
}

// ---- FALLBACK RULE-BASED FUNCTIONS ----

function getFallbackRecommendations(context: string): { question: string; answer: string }[] {
    const advice: { question: string; answer: string }[] = [];

    const revenueMatch = context.match(/Revenue ₹([\d,]+)/g);
    const burnMatch = context.match(/Burn Rate ₹([\d,]+)/g);
    const runwayMatch = context.match(/Runway (\d+) months/g);
    const churnMatch = context.match(/Churn Rate ([\d.]+)%/g);
    const scoreMatch = context.match(/Score (\d+)\/100/g);

    const latestRevenue = revenueMatch ? revenueMatch[revenueMatch.length - 1] : null;
    const latestBurn = burnMatch ? burnMatch[burnMatch.length - 1] : null;
    const latestRunway = runwayMatch ? runwayMatch[runwayMatch.length - 1] : null;
    const latestChurn = churnMatch ? churnMatch[churnMatch.length - 1] : null;
    const latestScore = scoreMatch ? scoreMatch[scoreMatch.length - 1] : null;

    advice.push({
        question: "What is my overall startup health assessment?",
        answer: `Based on your data: ${latestScore || 'Score available after metrics submission'}. ${latestRevenue || 'Submit metrics to see revenue'}. ${latestRunway || 'Runway data needed'}. ${latestChurn ? `Current churn: ${latestChurn}` : 'Track churn rate for deeper insights'}. Your data spans ${(revenueMatch || []).length} months of history.`
    });

    if (context.includes('OVERDUE')) {
        advice.push({
            question: "I have overdue milestones — what should I prioritize?",
            answer: "You have overdue milestones. Prioritize by: 1) Business impact — which affect revenue/users directly? 2) Dependencies — which block other work? 3) Stakeholder expectations — which were promised to investors? Re-estimate deadlines realistically."
        });
    }

    if (context.includes('CRITICAL') || context.includes('WARNING')) {
        advice.push({
            question: "What do my active alerts mean?",
            answer: "Your system has flagged alerts based on metric trends. Address critical alerts within 1-2 weeks and warnings within the month. These often indicate compounding issues."
        });
    }

    advice.push({
        question: "How can I improve my health score?",
        answer: `Your health score components: Revenue Growth (25%), User Growth (20%), Burn Efficiency (20%), Churn Stability (15%), Runway Stability (20%). Focus on the lowest-scoring component first. ${latestBurn && latestRevenue ? `Compare your burn (${latestBurn}) against revenue (${latestRevenue}).` : 'Submit metrics for detailed breakdown.'}`
    });

    advice.push({
        question: "When should I consider fundraising?",
        answer: `${latestRunway || 'Track runway to plan fundraising'}. Start 6 months before you need capital. Show 3+ months of consistent growth, improving unit economics, and clear market opportunity.`
    });

    return advice;
}

function getFallbackAnswer(question: string, context: string): string {
    const q = question.toLowerCase();

    if (q.includes('revenue') || q.includes('sales')) {
        const m = context.match(/Revenue ₹([\d,]+)/g);
        return m && m.length >= 2
            ? `Revenue history: ${m.length} months tracked. Latest: ${m[m.length - 1]}. Previous: ${m[m.length - 2]}. Set OPENROUTER_API_KEY for deep AI analysis.`
            : 'Submit metrics to get revenue analysis.';
    }
    if (q.includes('burn') || q.includes('expense')) {
        const m = context.match(/Burn Rate ₹([\d,]+)/g);
        return m ? `Burn rate: Latest ${m[m.length - 1]}. ${m.length} months tracked. Set OPENROUTER_API_KEY for optimization advice.` : 'Submit metrics for burn analysis.';
    }
    if (q.includes('churn') || q.includes('retention')) {
        const m = context.match(/Churn Rate ([\d.]+)%/g);
        return m ? `Churn rates: ${m.join(', ')}. Set OPENROUTER_API_KEY for AI-powered retention strategies.` : 'Track churn in metrics for analysis.';
    }

    return `I've analyzed your data (${(context.match(/Period:/g) || []).length} months). Set OPENROUTER_API_KEY for detailed AI-powered answers using ${MODEL}.`;
}
