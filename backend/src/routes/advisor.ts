import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateAIRecommendations, askAIQuestion, getDataSummary } from '../services/aiAdvisor';

const router = Router();

// GET /api/advisor – get AI-generated advice based on all company data
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        // Get data summary for context display
        const context = await getDataSummary(profile._id);

        // Generate AI recommendations using full company data
        const { advice, contextSummary } = await generateAIRecommendations(profile._id);

        res.json({
            advice,
            context,
            contextSummary,
            dataFed: [
                'Complete startup profile',
                `${context.metricsMonths} months of financial & operational metrics`,
                'Health score history with component breakdown',
                `Milestones (${context.milestones})`,
                `${context.activeAlerts} active alerts`,
                'Industry benchmark comparisons'
            ]
        });
    } catch (error: any) {
        console.error('Advisor error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/advisor/ask – answer a custom question using AI with full data context
router.post('/ask', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        // Ask AI with full company data context
        const { answer, dataPointsUsed } = await askAIQuestion(profile._id, question);

        res.json({ question, answer, dataPointsUsed });
    } catch (error: any) {
        console.error('Advisor ask error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

export default router;
