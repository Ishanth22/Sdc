import nodemailer from 'nodemailer';
import twilio from 'twilio';
import mongoose from 'mongoose';
import Metrics from '../models/Metrics';
import Alert, { IAlert } from '../models/Alert';
import StartupProfile from '../models/StartupProfile';
import User from '../models/User';

// ─── Email Transport ──────────────────────────────────────────────────────────
function getEmailTransport() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
}

// ─── Twilio SMS ───────────────────────────────────────────────────────────────
function getSmsClient() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// ─── Send notification (email + SMS) ─────────────────────────────────────────
async function sendNotification(
    toEmail: string | undefined,
    toPhone: string | undefined,
    subject: string,
    text: string,
    htmlBody: string
) {
    const errors: string[] = [];

    // Email
    if (toEmail) {
        const transporter = getEmailTransport();
        if (transporter) {
            try {
                await transporter.sendMail({
                    from: `"🚨 NSPMS Alerts" <${process.env.GMAIL_USER}>`,
                    to: toEmail,
                    subject,
                    text,
                    html: htmlBody,
                });
                console.log(`[Alert] Email sent to ${toEmail}`);
            } catch (e: any) {
                errors.push(`Email error: ${e.message}`);
                console.error('[Alert] Email error:', e.message);
            }
        }
    }

    // SMS
    if (toPhone) {
        const client = getSmsClient();
        if (client && process.env.TWILIO_PHONE_NUMBER) {
            try {
                await client.messages.create({
                    body: text,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: toPhone,
                });
                console.log(`[Alert] SMS sent to ${toPhone}`);
            } catch (e: any) {
                errors.push(`SMS error: ${e.message}`);
                console.error('[Alert] SMS error:', e.message);
            }
        }
    }

    return errors;
}

// ─── HTML email template ──────────────────────────────────────────────────────
function buildEmailHtml(severity: string, title: string, message: string, period: string, startupName: string): string {
    const colors: Record<string, string> = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
    const color = colors[severity] || '#6366f1';
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="background:#0f172a;font-family:Inter,Arial,sans-serif;margin:0;padding:24px;">
  <div style="max-width:520px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
    <div style="background:${color};padding:16px 24px;">
      <span style="font-size:22px;">🚨</span>
      <span style="color:white;font-size:18px;font-weight:700;margin-left:8px;">NSPMS Alert</span>
    </div>
    <div style="padding:24px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">${startupName} · ${period}</p>
      <h2 style="color:white;font-size:20px;margin:0 0 12px;">${title}</h2>
      <p style="color:#cbd5e1;font-size:15px;line-height:1.6;margin:0 0 20px;">${message}</p>
      <div style="background:#0f172a;border-radius:8px;padding:12px 16px;border-left:3px solid ${color};">
        <span style="color:${color};font-size:13px;font-weight:600;">Severity: ${severity.toUpperCase()}</span>
      </div>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0;">Log in to your dashboard to take action → <a href="http://localhost:5173/dashboard" style="color:#6366f1;">Open Dashboard</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Core alert checker ───────────────────────────────────────────────────────
export async function checkAndSendAlerts(
    startupId: mongoose.Types.ObjectId | string,
    period: string
): Promise<IAlert[]> {
    const allMetrics = await Metrics.find({ startupId }).sort({ period: 1 });
    if (allMetrics.length === 0) return [];

    const profile = await StartupProfile.findById(startupId) as any;
    if (!profile) return [];

    // alertsEnabled check
    if (profile.alertsEnabled === false) return [];

    // Use alertEmail (user-configured) — fall back to login email
    const user = await User.findById(profile.userId);
    const toEmail = profile.alertEmail || user?.email;
    const toPhone = profile.alertPhone || undefined;
    const startupName = profile.companyName || 'Your Startup';

    const newAlerts: IAlert[] = [];

    const latest = allMetrics[allMetrics.length - 1];
    const curRevenue = latest.financial.revenue || 0;
    const curExpenses = latest.financial.monthlyExpenses || latest.financial.burnRate || 0;
    const curBurn = Math.max(0, curExpenses - curRevenue);
    const curCash = (latest.financial as any).cashOnHand || 0;
    const curRunway = curBurn > 0 ? Math.round(curCash / curBurn) : (curCash > 0 ? 999 : 0);
    const curChurn = latest.operational.churnRate || 0;

    // Check if a DB alert of this type already exists (to avoid duplicate documents)
    const alertDocExists = async (type: string, withinDays = 7) => {
        const since = new Date(Date.now() - withinDays * 86400000);
        return !!(await Alert.findOne({ startupId, type, dismissed: false, createdAt: { $gte: since } }));
    };

    // Check if email for this alert type was sent in the last 24 hours (to avoid spam)
    const emailSentRecently = async (type: string) => {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return !!(await Alert.findOne({ startupId, type, createdAt: { $gte: since } }));
    };

    const handleAlert = async (
        type: IAlert['type'],
        severity: IAlert['severity'],
        title: string,
        message: string
    ) => {
        // Always send email if NOT sent in last 24h (prevents spam but always notifies on re-submit)
        const skipEmail = await emailSentRecently(type);

        // Only create a new DB alert document if none exists in last 7 days
        let alert: IAlert | null = null;
        if (!(await alertDocExists(type))) {
            alert = await Alert.create({ startupId, type, severity, title, message, period, dismissed: false });
            newAlerts.push(alert);
            console.log(`[Alert] Created DB alert: ${type}`);
        }

        // Send email notification (unless already sent in last 24h)
        if (!skipEmail) {
            console.log(`[Alert] Sending email for ${type} to ${toEmail}`);
            const text = `🚨 NSPMS Alert [${severity.toUpperCase()}]\n${title}\n${message}\nPeriod: ${period}`;
            await sendNotification(toEmail, toPhone, `🚨 ${title}`, text, buildEmailHtml(severity, title, message, period, startupName));
        } else {
            console.log(`[Alert] Email for ${type} already sent in last 24h — skipping`);
        }

        return alert;
    };

    // ── Rule 1: Runway < 6 months ────────────────────────────────────────────
    if (curRunway > 0 && curRunway < 6) {
        const severity: IAlert['severity'] = curRunway <= 2 ? 'critical' : 'warning';
        await handleAlert(
            'runway', severity,
            `⚡ Runway Critical: Only ${curRunway} Month${curRunway !== 1 ? 's' : ''} Left`,
            `Your current cash runway is just ${curRunway} month${curRunway !== 1 ? 's' : ''}. With a burn rate of ₹${curBurn.toLocaleString('en-IN')}/month and ₹${curCash.toLocaleString('en-IN')} cash on hand, immediate action is needed. Consider cutting expenses or accelerating fundraising.`
        );
    }

    // ── Rule 2: Burn rate increasing 3 months in a row ──────────────────────
    if (allMetrics.length >= 3) {
        const last3 = allMetrics.slice(-3);
        const burns = last3.map(m => {
            const rev = m.financial.revenue || 0;
            const exp = m.financial.monthlyExpenses || m.financial.burnRate || 0;
            return Math.max(0, exp - rev);
        });
        if (burns[0] < burns[1] && burns[1] < burns[2] && burns[2] > 0) {
            const increase = Math.round(((burns[2] - burns[0]) / (burns[0] || 1)) * 100);
            await handleAlert(
                'burn_rate', 'warning',
                `🔴 Burn Rate Rising 3 Months in a Row`,
                `Your burn rate has increased consecutively: ₹${burns[0].toLocaleString('en-IN')} → ₹${burns[1].toLocaleString('en-IN')} → ₹${burns[2].toLocaleString('en-IN')}/month (+${increase}% total). This trend will significantly reduce your runway.`
            );
        }
    }

    // ── Rule 3: Churn > 15% ──────────────────────────────────────────────────
    if (curChurn > 15) {
        const severity: IAlert['severity'] = curChurn > 25 ? 'critical' : 'warning';
        await handleAlert(
            'churn_spike', severity,
            `📉 High Churn Rate: ${curChurn}%`,
            `Your monthly churn rate of ${curChurn}% exceeds the 15% danger threshold. Focus on retention strategies, onboarding improvements, and collecting feedback from churned users.`
        );
    }

    // ── Rule 4: Revenue dropped more than 20% MoM ───────────────────────────
    if (allMetrics.length >= 2) {
        const prev = allMetrics[allMetrics.length - 2];
        const prevRevenue = prev.financial.revenue || 0;
        if (prevRevenue > 0 && curRevenue < prevRevenue * 0.8) {
            const dropPct = Math.round(((prevRevenue - curRevenue) / prevRevenue) * 100);
            await handleAlert(
                'revenue_drop', 'critical',
                `📉 Revenue Dropped ${dropPct}% This Month`,
                `Revenue fell from ₹${prevRevenue.toLocaleString('en-IN')} to ₹${curRevenue.toLocaleString('en-IN')} — a ${dropPct}% drop month-over-month. Investigate user loss, pricing issues, or market conditions immediately.`
            );
        }
    }

    return newAlerts;
}

// ─── Send a test alert (for settings page) ───────────────────────────────────
export async function sendTestAlert(toEmail?: string, toPhone?: string): Promise<{ ok: boolean; errors: string[] }> {
    const text = '✅ NSPMS Alert test successful! You will now receive real-time alerts when critical thresholds are crossed.';
    const html = buildEmailHtml('info', '✅ Test Alert — NSPMS', text, 'Test', 'Your Startup');
    const errors = await sendNotification(toEmail, toPhone, '✅ NSPMS Alert Test', text, html);
    return { ok: errors.length === 0, errors };
}
