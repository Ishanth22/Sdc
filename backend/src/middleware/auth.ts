import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import Subscription, { PLAN_FEATURES, PlanType } from '../models/Subscription';
import AuditLog from '../models/AuditLog';

export interface AuthRequest extends Request {
    user?: IUser;
    plan?: PlanType;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as { userId: string };
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;

        // Attach plan info
        const sub = await Subscription.findOne({ userId: user._id });
        req.plan = sub?.plan || 'free';

        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

export const requireInvestor = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'investor' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Investor access required' });
    }
    next();
};

export const requireFounder = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'founder') {
        return res.status(403).json({ error: 'Founder access required' });
    }
    next();
};

/**
 * Feature gate middleware – checks if user's plan includes the required feature.
 */
export const requireFeature = (feature: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const plan = req.plan || 'free';
        const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
        if (!features.includes(feature)) {
            return res.status(403).json({
                error: 'Feature not available on your plan',
                feature,
                currentPlan: plan,
                requiredPlan: Object.keys(PLAN_FEATURES).find(p => PLAN_FEATURES[p as PlanType].includes(feature)) || 'enterprise'
            });
        }
        next();
    };
};

/**
 * Audit log middleware – logs user actions for enterprise security.
 */
export const auditLog = (action: string, resource: string) => {
    return async (req: AuthRequest, _res: Response, next: NextFunction) => {
        try {
            if (req.user) {
                await AuditLog.create({
                    userId: req.user._id,
                    action,
                    resource,
                    resourceId: req.params.id || undefined,
                    details: req.method === 'GET' ? undefined : JSON.stringify(req.body).substring(0, 500),
                    ipAddress: req.ip || req.socket.remoteAddress,
                    userAgent: req.headers['user-agent']?.substring(0, 200)
                });
            }
        } catch (e) {
            // Don't block request if audit fails
            console.error('Audit log error:', e);
        }
        next();
    };
};

/**
 * Organization role middleware – checks if user has the required org role.
 * Supports arrays: requireOrgRole(['owner', 'finance_manager'])
 */
export const requireOrgRole = (roles: string | string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const allowed = Array.isArray(roles) ? roles : [roles];
        const userRole = req.user?.orgRole || 'viewer';
        if (!allowed.includes(userRole)) {
            return res.status(403).json({
                error: 'Insufficient organization role',
                requiredRoles: allowed,
                currentRole: userRole
            });
        }
        next();
    };
};

