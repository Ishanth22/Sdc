import { Router, Response } from 'express';
import CustomKPI from '../models/CustomKPI';
import Metrics from '../models/Metrics';
import StartupProfile from '../models/StartupProfile';
import { authenticate, requireFeature, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/custom-kpi – list all custom KPIs
router.get('/', authenticate, requireFeature('custom_kpi'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });
        const kpis = await CustomKPI.find({ startupId: profile._id }).sort({ createdAt: -1 });
        res.json(kpis);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/custom-kpi – create a custom KPI and auto-calculate values
router.post('/', authenticate, requireFeature('custom_kpi'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const { name, formula, unit, description } = req.body;
        if (!name || !formula) return res.status(400).json({ error: 'Name and formula are required' });

        // Fetch all metrics to calculate values
        const metrics = await Metrics.find({ startupId: profile._id }).sort({ period: 1 });

        // Calculate formula for each period
        const values = metrics.map(m => {
            const vars: Record<string, number> = {
                revenue: m.financial.revenue,
                expenses: m.financial.monthlyExpenses || m.financial.burnRate,
                burnrate: m.financial.burnRate,
                runway: m.financial.runwayMonths,
                funding: m.financial.totalFunding || 0,
                users: m.operational.activeUsers,
                newusers: m.operational.newUsers,
                churn: m.operational.churnRate || 0,
                cac: m.operational.cac,
                ltv: m.operational.ltv,
                gmv: m.operational.gmv,
                rnd: m.innovation.rndSpend,
                jobs: m.impact.directJobs,
                teamsize: m.impact.directJobs,
            };

            try {
                const value = evaluateFormula(formula, vars);
                return { period: m.period, value: isFinite(value) ? parseFloat(value.toFixed(2)) : 0 };
            } catch {
                return { period: m.period, value: 0 };
            }
        });

        const kpi = await CustomKPI.create({
            startupId: profile._id,
            name,
            formula,
            unit: unit || '',
            description: description || '',
            values
        });

        res.status(201).json(kpi);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/custom-kpi/:id
router.delete('/:id', authenticate, requireFeature('custom_kpi'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });
        await CustomKPI.findOneAndDelete({ _id: req.params.id, startupId: profile._id });
        res.json({ message: 'Deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Safely evaluate a formula string with given variables.
 * Supports: +, -, *, /, (, ), variable names, numbers
 */
function evaluateFormula(formula: string, vars: Record<string, number>): number {
    // Replace variable names with values
    let expr = formula.toLowerCase().replace(/\s+/g, '');
    for (const [key, value] of Object.entries(vars)) {
        expr = expr.replace(new RegExp(key, 'g'), String(value));
    }
    // Only allow safe characters
    if (!/^[\d\s+\-*/().]+$/.test(expr)) {
        throw new Error('Invalid formula');
    }
    // eslint-disable-next-line no-eval
    return Function(`"use strict"; return (${expr})`)();
}

export default router;
