import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { authenticate, requireFeature, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/audit – get audit logs for current user
router.get('/', authenticate, requireFeature('audit_logs'), async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const page = Number(req.query.page) || 1;
        const logs = await AuditLog.find({ userId: req.user!._id })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await AuditLog.countDocuments({ userId: req.user!._id });
        res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/audit/all – admin gets all audit logs
router.get('/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const page = Number(req.query.page) || 1;
        const logs = await AuditLog.find()
            .populate('userId', 'email name role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        const total = await AuditLog.countDocuments();
        res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
