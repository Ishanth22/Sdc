import { Router, Response } from 'express';
import VitalityScore from '../models/VitalityScore';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/score/current
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const latest = await VitalityScore.findOne({ startupId: profile._id }).sort({ period: -1 });
        if (!latest) {
            return res.json({ score: 0, components: { financial: 0, operational: 0, innovation: 0, impact: 0 }, riskFlags: [] });
        }
        res.json(latest);
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
