import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
    try {
        const { email, password, role, companyName, sector, stage, city, foundedDate } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            passwordHash,
            role: role || 'founder'
        });

        // If founder, create empty startup profile
        if (user.role === 'founder' && companyName) {
            await StartupProfile.create({
                userId: user._id,
                companyName: companyName || 'My Startup',
                cin: `CIN${Date.now()}`,
                sector: sector || 'Other',
                stage: stage || 'Idea',
                foundedDate: foundedDate ? new Date(foundedDate) : new Date(),
                city: city || 'Bengaluru',
                teamSize: 1
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: '7d'
        });

        res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: '7d'
        });

        res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        res.json({
            user: { id: req.user!._id, email: req.user!.email, role: req.user!.role },
            profile
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
