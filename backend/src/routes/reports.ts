import { Router, Response } from 'express';
import Metrics from '../models/Metrics';
import VitalityScore from '../models/VitalityScore';
import Milestone from '../models/Milestone';
import Alert from '../models/Alert';
import StartupProfile from '../models/StartupProfile';
import { authenticate, requireFeature, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/reports/summary – JSON summary for frontend PDF generation
router.get('/summary', authenticate, requireFeature('report_export'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const metrics = await Metrics.find({ startupId: profile._id }).sort({ period: 1 });
        const scores = await VitalityScore.find({ startupId: profile._id }).sort({ period: 1 });
        const milestones = await Milestone.find({ startupId: profile._id });
        const alerts = await Alert.find({ startupId: profile._id, dismissed: false });
        const latest = metrics[metrics.length - 1];
        const latestScore = scores[scores.length - 1];

        const report = {
            generatedAt: new Date().toISOString(),
            company: {
                name: profile.companyName,
                sector: profile.sector,
                stage: profile.stage,
                city: profile.city,
                teamSize: profile.teamSize,
                founded: profile.foundedDate
            },
            currentMetrics: latest ? {
                period: latest.period,
                revenue: latest.financial.revenue,
                expenses: latest.financial.monthlyExpenses || latest.financial.burnRate,
                burnRate: latest.financial.burnRate,
                runwayMonths: latest.financial.runwayMonths,
                totalFunding: latest.financial.totalFunding || 0,
                activeUsers: latest.operational.activeUsers,
                newUsers: latest.operational.newUsers,
                churnRate: latest.operational.churnRate || 0,
                cac: latest.operational.cac,
                ltv: latest.operational.ltv,
                ltvCacRatio: latest.operational.cac > 0 ? parseFloat((latest.operational.ltv / latest.operational.cac).toFixed(2)) : 0
            } : null,
            healthScore: latestScore ? {
                score: latestScore.score,
                components: latestScore.components,
                riskFlags: latestScore.riskFlags,
                riskLevel: latestScore.riskFlags.length >= 4 ? 'Critical' : latestScore.riskFlags.length >= 3 ? 'High' : latestScore.riskFlags.length >= 1 ? 'Moderate' : 'Low'
            } : null,
            metricsHistory: metrics.map(m => ({
                period: m.period,
                revenue: m.financial.revenue,
                burnRate: m.financial.burnRate,
                runway: m.financial.runwayMonths,
                users: m.operational.activeUsers,
                churn: m.operational.churnRate || 0
            })),
            scoreHistory: scores.map(s => ({
                period: s.period,
                score: s.score
            })),
            milestones: milestones.map(m => ({
                title: m.title,
                category: m.category,
                deadline: m.deadline,
                completion: m.completionPercent,
                completed: m.completed
            })),
            activeAlerts: alerts.map(a => ({
                title: a.title,
                severity: a.severity,
                message: a.message
            })),
            summary: {
                totalMetricsMonths: metrics.length,
                avgRevenue: metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.financial.revenue, 0) / metrics.length) : 0,
                avgBurnRate: metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.financial.burnRate, 0) / metrics.length) : 0,
                milestonesCompleted: milestones.filter(m => m.completed).length,
                milestonesTotal: milestones.length,
                alertCount: alerts.length
            }
        };

        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/reports/csv – export metrics as CSV
router.get('/csv', authenticate, requireFeature('report_export'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const metrics = await Metrics.find({ startupId: profile._id }).sort({ period: 1 });

        const headers = 'Period,Revenue,Expenses,BurnRate,Runway,TotalFunding,ActiveUsers,NewUsers,ChurnRate,CAC,LTV,R&D Spend';
        const rows = metrics.map(m =>
            `${m.period},${m.financial.revenue},${m.financial.monthlyExpenses || ''},${m.financial.burnRate},${m.financial.runwayMonths},${m.financial.totalFunding || ''},${m.operational.activeUsers},${m.operational.newUsers},${m.operational.churnRate || ''},${m.operational.cac},${m.operational.ltv},${m.innovation.rndSpend}`
        );

        const csv = [headers, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${profile.companyName.replace(/\s+/g, '_')}_metrics.csv`);
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
