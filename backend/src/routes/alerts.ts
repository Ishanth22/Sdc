import { Router, Response } from 'express';
import Alert from '../models/Alert';
import StartupProfile from '../models/StartupProfile';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendTestAlert } from '../services/alertNotifier';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const dismissed = req.query.dismissed === 'true';
        const query: any = { startupId: profile._id };
        if (!dismissed) query.dismissed = false;

        const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(alerts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id/dismiss', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const alert = await Alert.findOneAndUpdate(
            { _id: req.params.id, startupId: profile._id },
            { dismissed: true },
            { new: true }
        );
        if (!alert) return res.status(404).json({ error: 'Alert not found' });
        res.json(alert);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/dismiss-all', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });
        await Alert.updateMany({ startupId: profile._id, dismissed: false }, { dismissed: true });
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });
        res.json({
            alertPhone: (profile as any).alertPhone || '',
            alertEmail: (profile as any).alertEmail || '',
            alertsEnabled: (profile as any).alertsEnabled !== false,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { alertPhone, alertEmail, alertsEnabled } = req.body;
        const profile = await StartupProfile.findOneAndUpdate(
            { userId: req.user!._id },
            { $set: { alertPhone, alertEmail, alertsEnabled } },
            { new: true }
        );
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });
        res.json({ ok: true, alertPhone, alertEmail, alertsEnabled });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/test', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        if (!profile) return res.status(404).json({ error: 'Startup profile not found' });

        const email = req.body.email || (profile as any).alertEmail;
        const phone = req.body.phone || (profile as any).alertPhone;

        if (!email && !phone) {
            return res.status(400).json({ error: 'No email or phone configured. Save settings first.' });
        }

        const result = await sendTestAlert(email || undefined, phone || undefined);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
