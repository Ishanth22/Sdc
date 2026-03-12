import { Router, Response } from 'express';
import Milestone from '../models/Milestone';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/milestones
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const filter: any = { startupId: profile._id };
        if (req.query.type === 'okr') filter.isOKR = true;
        if (req.query.type === 'milestone') filter.isOKR = { $ne: true };

        const milestones = await Milestone.find(filter).sort({ deadline: 1 });
        res.json(milestones);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/milestones
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const data: any = {
            startupId: profile._id,
            title: req.body.title,
            description: req.body.description || '',
            category: req.body.category || 'other',
            deadline: new Date(req.body.deadline),
            completionPercent: req.body.completionPercent || 0,
            isOKR: req.body.isOKR || false,
            objectiveType: req.body.objectiveType,
            keyResults: req.body.keyResults || []
        };

        // For OKRs, auto-calculate completion from key results
        if (data.isOKR && data.keyResults.length > 0) {
            const avgProgress = data.keyResults.reduce((sum: number, kr: any) => {
                return sum + Math.min(100, (kr.current / kr.target) * 100);
            }, 0) / data.keyResults.length;
            data.completionPercent = Math.round(avgProgress);
        }

        const milestone = await Milestone.create(data);
        res.status(201).json(milestone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/milestones/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const updates: any = {};
        const allowed = ['title', 'description', 'category', 'deadline', 'completionPercent', 'completed', 'isOKR', 'objectiveType', 'keyResults'];
        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        // Auto-set completedAt
        if (updates.completed === true) {
            updates.completedAt = new Date();
            updates.completionPercent = 100;
        }

        // Recalculate OKR completion from key results
        if (updates.keyResults && updates.keyResults.length > 0) {
            const avgProgress = updates.keyResults.reduce((sum: number, kr: any) => {
                return sum + Math.min(100, (kr.current / kr.target) * 100);
            }, 0) / updates.keyResults.length;
            updates.completionPercent = Math.round(avgProgress);
            if (avgProgress >= 100) {
                updates.completed = true;
                updates.completedAt = new Date();
            }
        }

        const milestone = await Milestone.findOneAndUpdate(
            { _id: req.params.id, startupId: profile._id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        res.json(milestone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/milestones/:id/key-result/:krIndex – update a specific key result
router.put('/:id/key-result/:krIndex', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        const milestone = await Milestone.findOne({ _id: req.params.id, startupId: profile._id });
        if (!milestone) return res.status(404).json({ error: 'Milestone not found' });

        const krIdx = parseInt(req.params.krIndex);
        if (krIdx < 0 || krIdx >= milestone.keyResults.length) {
            return res.status(400).json({ error: 'Invalid key result index' });
        }

        if (req.body.current !== undefined) milestone.keyResults[krIdx].current = req.body.current;
        if (req.body.title !== undefined) milestone.keyResults[krIdx].title = req.body.title;
        if (req.body.target !== undefined) milestone.keyResults[krIdx].target = req.body.target;

        // Recalculate OKR progress
        const avgProgress = milestone.keyResults.reduce((sum, kr) => {
            return sum + Math.min(100, (kr.current / kr.target) * 100);
        }, 0) / milestone.keyResults.length;
        milestone.completionPercent = Math.round(avgProgress);

        if (avgProgress >= 100) {
            milestone.completed = true;
            milestone.completedAt = new Date();
        }

        await milestone.save();
        res.json(milestone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/milestones/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) {
            return res.status(404).json({ error: 'Startup profile not found' });
        }

        const milestone = await Milestone.findOneAndDelete({
            _id: req.params.id,
            startupId: profile._id
        });

        if (!milestone) {
            return res.status(404).json({ error: 'Milestone not found' });
        }

        res.json({ message: 'Milestone deleted' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
