import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import { authenticate, requireFeature, AuthRequest } from '../middleware/auth';
import { generateForecasts } from '../services/forecasting';

const router = Router();

// GET /api/forecast – 6-month revenue & runway forecasting
router.get('/', authenticate, requireFeature('forecasting'), async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const forecast = await generateForecasts(profile._id);
        res.json(forecast);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
