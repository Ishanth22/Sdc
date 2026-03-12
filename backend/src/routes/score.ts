import { Router, Response } from 'express';
import VitalityScore from '../models/VitalityScore';
import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/score/current – includes risk level, explanation, funding readiness
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const latest = await VitalityScore.findOne({ startupId: profile._id }).sort({ period: -1 });
        if (!latest) {
            return res.json({
                score: 0,
                components: { financial: 0, operational: 0, innovation: 0, impact: 0, revenueGrowth: 0, userGrowth: 0, burnEfficiency: 0, churnStability: 0, runwayStability: 0 },
                riskFlags: [],
                riskLevel: 'Low',
                explanation: ['Submit your first metrics to get a health score.'],
                fundingReadiness: 0
            });
        }

        // Calculate risk level from flags
        const riskFlagCount = latest.riskFlags.length;
        let riskLevel = 'Low';
        if (riskFlagCount >= 4) riskLevel = 'Critical';
        else if (riskFlagCount >= 3) riskLevel = 'High';
        else if (riskFlagCount >= 1) riskLevel = 'Moderate';

        // Generate explanation
        const explanation: string[] = [];
        const score = latest.score;
        const c = latest.components as any;

        if (score >= 80) explanation.push('🟢 Excellent overall health — your startup is performing well across metrics.');
        else if (score >= 60) explanation.push('🟡 Good health with room for improvement in some areas.');
        else if (score >= 40) explanation.push('🟠 Moderate health — several metrics need attention.');
        else explanation.push('🔴 Your startup needs immediate attention in multiple areas.');

        if (c.revenueGrowth >= 70) explanation.push('Strong revenue growth is boosting your score.');
        else if (c.revenueGrowth < 40) explanation.push('Low revenue growth is dragging your score down.');

        if (c.userGrowth >= 70) explanation.push('Healthy user acquisition momentum.');
        else if (c.userGrowth < 40) explanation.push('User growth stagnation is affecting health.');

        if (c.burnEfficiency >= 70) explanation.push('Efficient burn rate management is a positive signal.');
        else if (c.burnEfficiency < 40) explanation.push('High burn rate relative to revenue is hurting efficiency.');

        if (c.churnStability >= 70) explanation.push('Low churn indicates strong product-market fit.');
        else if (c.churnStability < 40) explanation.push('High churn rate suggests retention issues.');

        if (c.runwayStability >= 70) explanation.push('Comfortable runway gives stability.');
        else if (c.runwayStability < 40) explanation.push('Short runway — consider fundraising.');

        // Calculate funding readiness
        const latestMetrics = await Metrics.findOne({ startupId: profile._id }).sort({ period: -1 });
        let fundingReadiness = 0;
        if (latestMetrics) {
            if (latestMetrics.financial.revenue > 0) fundingReadiness += 15;
            if (latestMetrics.financial.revenue > 500000) fundingReadiness += 10;
            if (latestMetrics.operational.activeUsers > 1000) fundingReadiness += 15;
            if (latestMetrics.operational.activeUsers > 10000) fundingReadiness += 10;
            if (profile.teamSize >= 20) fundingReadiness += 10;
            if (profile.teamSize >= 50) fundingReadiness += 5;
            if (latestMetrics.financial.runwayMonths >= 6) fundingReadiness += 10;
            if (score >= 60) fundingReadiness += 15;
            if (score >= 80) fundingReadiness += 10;
        }

        res.json({
            ...latest.toObject(),
            riskLevel,
            explanation,
            fundingReadiness: Math.min(100, fundingReadiness)
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/score/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const scores = await VitalityScore.find({ startupId: profile._id }).sort({ period: 1 });
        res.json(scores);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
