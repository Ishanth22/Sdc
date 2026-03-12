import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import { authenticate, requireFeature, AuthRequest } from '../middleware/auth';
import { simulateScenario } from '../services/forecasting';

const router = Router();

// POST /api/simulation – simulate what-if scenarios
router.post('/', authenticate, requireFeature('scenario_simulation'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const { revenueChangePercent, expenseChangePercent, additionalFunding, churnChangePercent } = req.body;

        const result = await simulateScenario(profile._id, {
            revenueChangePercent: Number(revenueChangePercent) || 0,
            expenseChangePercent: Number(expenseChangePercent) || 0,
            additionalFunding: Number(additionalFunding) || 0,
            churnChangePercent: Number(churnChangePercent) || 0
        });

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
