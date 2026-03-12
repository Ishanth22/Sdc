import { Router, Response } from 'express';
import Subscription, { PLAN_FEATURES, PlanType } from '../models/Subscription';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/subscription – get current plan
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        let sub = await Subscription.findOne({ userId: req.user!._id });
        if (!sub) {
            sub = await Subscription.create({ userId: req.user!._id, plan: 'free' });
        }
        const features = PLAN_FEATURES[sub.plan as PlanType] || PLAN_FEATURES.free;
        res.json({ plan: sub.plan, activatedAt: sub.activatedAt, features });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/subscription/plans – list all plans and features
router.get('/plans', async (_req, res: Response) => {
    res.json({
        plans: [
            {
                name: 'Free',
                id: 'free',
                price: '₹0/month',
                features: PLAN_FEATURES.free,
                limits: { kpis: 5, forecasting: false, simulation: false, customKpi: false },
                description: 'Basic startup monitoring'
            },
            {
                name: 'Pro',
                id: 'pro',
                price: '₹2,999/month',
                features: PLAN_FEATURES.pro,
                limits: { kpis: 20, forecasting: true, simulation: false, customKpi: false },
                description: 'Advanced analytics & AI insights'
            },
            {
                name: 'Enterprise',
                id: 'enterprise',
                price: '₹9,999/month',
                features: PLAN_FEATURES.enterprise,
                limits: { kpis: 'Unlimited', forecasting: true, simulation: true, customKpi: true },
                description: 'Full platform with investor tools'
            }
        ]
    });
});

// PUT /api/subscription/upgrade – change plan (admin or self)
router.put('/upgrade', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { plan } = req.body;
        if (!['free', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Choose free, pro, or enterprise.' });
        }
        const sub = await Subscription.findOneAndUpdate(
            { userId: req.user!._id },
            { plan, activatedAt: new Date() },
            { upsert: true, new: true }
        );
        const features = PLAN_FEATURES[plan as PlanType];
        res.json({ message: `Plan upgraded to ${plan}`, subscription: sub, features });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/subscription/admin/:userId – admin can change any user's plan
router.put('/admin/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { plan } = req.body;
        if (!['free', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }
        const sub = await Subscription.findOneAndUpdate(
            { userId: req.params.userId },
            { plan, activatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ message: `Plan set to ${plan}`, subscription: sub });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
