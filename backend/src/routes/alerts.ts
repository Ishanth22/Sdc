import { Router, Response } from 'express';
import Alert from '../models/Alert';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/alerts – get all alerts for the current user's startup
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const dismissed = req.query.dismissed === 'true';
        const query: any = { startupId: profile._id };
        if (!dismissed) {
            query.dismissed = false;
        }

        const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(alerts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/alerts/:id/dismiss
router.put('/:id/dismiss', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const alert = await Alert.findOneAndUpdate(
            { _id: req.params.id, startupId: profile._id },
            { dismissed: true },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        res.json(alert);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
