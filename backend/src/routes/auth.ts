import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import StartupProfile from '../models/StartupProfile';
import Organization from '../models/Organization';
import Subscription from '../models/Subscription';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
    try {
        const { email, password, role, name, companyName, sector, stage, city, foundedDate } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const userRole = role || 'founder';
        if (!['founder', 'investor', 'admin'].includes(userRole)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            passwordHash,
            name: name || '',
            role: userRole
        });

        // If founder, create org + profile
        if (user.role === 'founder') {
            const orgName = companyName || 'My Organization';
            const org = await Organization.create({
                name: orgName,
                ownerId: user._id,
                members: [{ userId: user._id, role: 'owner' }]
            });
            user.organizationId = org._id;
            user.orgRole = 'owner';
            await user.save();

            if (companyName) {
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

            // Default free subscription
            await Subscription.create({ userId: user._id, plan: 'free' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: '7d'
        });

        res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login – with account lock
router.post('/login', async (req, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            const remainingMs = user.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(423).json({
                error: `Account locked due to too many failed attempts. Try again in ${remainingMin} minute(s).`
            });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            // Increment failed attempts
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
                await user.save();
                return res.status(423).json({
                    error: `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 15 minutes.`
                });
            }
            await user.save();
            return res.status(401).json({
                error: 'Invalid email or password',
                attemptsRemaining: MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts
            });
        }

        // Reset failed attempts on successful login
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: '7d'
        });

        res.json({ token, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const profile = await StartupProfile.findOne({ userId: req.user!._id });
        const org = req.user!.organizationId ? await Organization.findById(req.user!.organizationId) : null;
        res.json({
            user: {
                id: req.user!._id,
                email: req.user!.email,
                role: req.user!.role,
                name: req.user!.name,
                orgRole: req.user!.orgRole,
                organizationId: req.user!.organizationId
            },
            profile,
            organization: org ? { id: org._id, name: org.name, memberCount: org.members.length } : null
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res: Response) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            // Don't reveal if email exists
            return res.json({ message: 'If that email exists, a reset link has been generated.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.resetToken = token;
        user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
        await user.save();

        // In production, send email. For now, return token directly.
        res.json({
            message: 'Password reset token generated.',
            resetToken: token, // Remove in production — send via email instead
            expiresIn: '1 hour'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res: Response) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const user = await User.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined;
        await user.save();

        res.json({ message: 'Password reset successful. You can now login.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/invite – invite a team member to your organization
router.post('/invite', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { email, role } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const validRoles = ['finance_manager', 'growth_manager', 'viewer'];
        const inviteRole = validRoles.includes(role) ? role : 'viewer';

        // Must be org owner
        if (req.user!.orgRole !== 'owner') {
            return res.status(403).json({ error: 'Only organization owners can invite members' });
        }

        const org = await Organization.findById(req.user!.organizationId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        // Check if already a member
        const existing = await User.findOne({ email });
        if (existing && org.members.some(m => m.userId.toString() === existing._id.toString())) {
            return res.status(400).json({ error: 'User is already a member' });
        }

        const token = crypto.randomBytes(16).toString('hex');
        org.invites.push({
            email,
            role: inviteRole,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600000) // 7 days
        });
        await org.save();

        res.json({
            message: `Invite sent to ${email}`,
            inviteToken: token, // In production: send via email
            role: inviteRole,
            expiresIn: '7 days'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/accept-invite – accept team invitation
router.post('/accept-invite', async (req, res: Response) => {
    try {
        const { token, password, name } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Token and password are required' });
        }

        // Find org with this invite token
        const org = await Organization.findOne({
            'invites.token': token,
            'invites.expiresAt': { $gt: new Date() }
        });

        if (!org) {
            return res.status(400).json({ error: 'Invalid or expired invite token' });
        }

        const invite = org.invites.find(i => i.token === token);
        if (!invite) return res.status(400).json({ error: 'Invite not found' });

        // Create or update user
        let user = await User.findOne({ email: invite.email });
        if (!user) {
            const passwordHash = await bcrypt.hash(password, 10);
            user = await User.create({
                email: invite.email,
                passwordHash,
                name: name || '',
                role: 'founder',
                organizationId: org._id,
                orgRole: invite.role
            });
        } else {
            user.organizationId = org._id;
            user.orgRole = invite.role;
            await user.save();
        }

        // Add to org members
        org.members.push({ userId: user._id, role: invite.role, joinedAt: new Date() });
        org.invites = org.invites.filter(i => i.token !== token);
        await org.save();

        const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
            expiresIn: '7d'
        });

        res.json({ token: jwtToken, user: { id: user._id, email: user.email, role: user.role, name: user.name } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/team – list team members
router.get('/team', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user!.organizationId) {
            return res.json({ members: [], invites: [] });
        }
        const org = await Organization.findById(req.user!.organizationId).populate('members.userId', 'email name orgRole');
        if (!org) return res.json({ members: [], invites: [] });

        res.json({
            organization: org.name,
            members: org.members.map((m: any) => ({
                id: m.userId?._id || m.userId,
                email: m.userId?.email,
                name: m.userId?.name,
                role: m.role,
                joinedAt: m.joinedAt
            })),
            pendingInvites: org.invites.filter(i => i.expiresAt > new Date()).map(i => ({
                email: i.email,
                role: i.role,
                expiresAt: i.expiresAt
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
