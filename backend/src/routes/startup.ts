import { Router, Response } from 'express';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/startup/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }
        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/startup/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const allowedFields = ['companyName', 'sector', 'stage', 'city', 'teamSize', 'website', 'description', 'foundedDate'];
        const updates: any = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const profile = await StartupProfile.findOneAndUpdate(
            { userId: req.user!._id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
