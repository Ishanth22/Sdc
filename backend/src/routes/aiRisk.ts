import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateAIRiskPrediction, generateAIBenchmarkAnalysis } from '../services/aiRiskEngine';

const router = Router();


router.get('/predict', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const prediction = await generateAIRiskPrediction(profile._id);
        res.json(prediction);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


router.get('/benchmark', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const analysis = await generateAIBenchmarkAnalysis(profile._id);
        res.json(analysis);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
