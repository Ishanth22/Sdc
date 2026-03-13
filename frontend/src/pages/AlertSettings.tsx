import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/client';

const SEVERITY_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
    warning:  { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
    info:     { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', dot: 'bg-indigo-400' },
};
const TYPE_ICON: Record<string, string> = {
    runway: '⏱️', burn_rate: '🔥', churn_spike: '📉', revenue_drop: '💸', risk_level: '⚠️', funding: '💰'
};

const AlertSettings: React.FC = () => {
    const [settings, setSettings]   = useState({ alertPhone: '', alertEmail: '', alertsEnabled: true });
    const [alerts, setAlerts]       = useState<any[]>([]);
    const [saving, setSaving]       = useState(false);
    const [testing, setTesting]     = useState(false);
    const [testResult, setTestResult] = useState<{ ok?: boolean; msg: string } | null>(null);
    const [saved, setSaved]         = useState(false);

    useEffect(() => {
        api.get('/alerts/settings').then(r => setSettings(r.data)).catch(() => {});
        api.get('/alerts').then(r => setAlerts(r.data)).catch(() => {});
    }, []);

    const save = async () => {
        setSaving(true); setSaved(false);
        try { await api.put('/alerts/settings', settings); setSaved(true); setTimeout(() => setSaved(false), 3000); }
        catch (e: any) { alert(e.response?.data?.error || 'Save failed'); }
        finally { setSaving(false); }
    };

    const test = async () => {
        setTesting(true); setTestResult(null);
        try {
            const r = await api.post('/alerts/test', { email: settings.alertEmail, phone: settings.alertPhone });
            setTestResult({ ok: r.data.ok, msg: r.data.ok ? '✅ Test sent! Check your email/SMS.' : `⚠️ Sent with issues: ${r.data.errors?.join(', ')}` });
        } catch (e: any) { setTestResult({ ok: false, msg: `❌ ${e.response?.data?.error || e.message}` }); }
        finally { setTesting(false); }
    };

    const dismiss = async (id: string) => {
        await api.put(`/alerts/${id}/dismiss`).catch(() => {});
        setAlerts(prev => prev.filter(a => a._id !== id));
    };

    const dismissAll = async () => {
        await api.put('/alerts/dismiss-all').catch(() => {});
        setAlerts([]);
    };

    const inputCls = 'w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all placeholder-slate-500';

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-white">🚨 Alert Settings</h1>
                    <p className="text-sm text-slate-400 mt-1">Get real-time SMS & email when your startup crosses critical thresholds</p>
                </div>

                {/* What triggers alerts */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-white mb-4">📋 What Triggers Alerts</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            { icon: '⏱️', title: 'Runway < 6 Months', desc: 'Warns when your cash runway is dangerously low', color: 'text-red-400' },
                            { icon: '🔥', title: 'Burn Rate Rising 3 Months', desc: 'Detects when burn rate increases consecutively', color: 'text-amber-400' },
                            { icon: '📉', title: 'Churn > 15%', desc: 'Flags when monthly churn exceeds safe threshold', color: 'text-orange-400' },
                            { icon: '💸', title: 'Revenue Drop > 20%', desc: 'Notifies on sudden month-over-month revenue decline', color: 'text-red-400' },
                        ].map(t => (
                            <div key={t.title} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                <span className="text-xl mt-0.5">{t.icon}</span>
                                <div>
                                    <p className={`text-sm font-semibold ${t.color}`}>{t.title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Settings */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white">📲 Notification Contacts</h2>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-slate-400">Alerts enabled</span>
                            <div className="relative">
                                <input type="checkbox" checked={settings.alertsEnabled} onChange={e => setSettings(p => ({ ...p, alertsEnabled: e.target.checked }))} className="sr-only" />
                                <div onClick={() => setSettings(p => ({ ...p, alertsEnabled: !p.alertsEnabled }))}
                                    className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${settings.alertsEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.alertsEnabled ? 'translate-x-5' : ''}`} />
                                </div>
                            </div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">📧 Alert Email</label>
                            <input type="email" placeholder="you@example.com" value={settings.alertEmail}
                                onChange={e => setSettings(p => ({ ...p, alertEmail: e.target.value }))} className={inputCls} />
                            <p className="text-xs text-slate-500 mt-1">Uses Gmail SMTP — configure <code className="text-indigo-400">GMAIL_USER</code> in .env</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">📱 Alert Phone (SMS)</label>
                            <input type="tel" placeholder="+91 9876543210" value={settings.alertPhone}
                                onChange={e => setSettings(p => ({ ...p, alertPhone: e.target.value }))} className={inputCls} />
                            <p className="text-xs text-slate-500 mt-1">Uses Twilio — configure <code className="text-indigo-400">TWILIO_*</code> keys in .env</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                        <button onClick={save} disabled={saving}
                            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-all">
                            {saving ? 'Saving…' : saved ? '✅ Saved!' : '💾 Save Settings'}
                        </button>
                        <button onClick={test} disabled={testing || (!settings.alertEmail && !settings.alertPhone)}
                            className="px-5 py-2 bg-slate-800 border border-slate-700 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-all">
                            {testing ? 'Sending…' : '🧪 Send Test Alert'}
                        </button>
                        {testResult && (
                            <span className={`text-sm ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>{testResult.msg}</span>
                        )}
                    </div>
                </div>

                {/* Active Alerts */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/40">
                        <h2 className="text-sm font-bold text-white">
                            🔔 Active Alerts <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">{alerts.length}</span>
                        </h2>
                        {alerts.length > 0 && (
                            <button onClick={dismissAll} className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg hover:border-slate-600 transition-all">
                                Dismiss All
                            </button>
                        )}
                    </div>
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="text-white font-semibold">All clear!</p>
                            <p className="text-sm text-slate-500 mt-1">No active alerts. Your startup metrics look healthy.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/40">
                            {alerts.map(a => {
                                const s = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.info;
                                return (
                                    <div key={a._id} className={`flex items-start gap-4 px-5 py-4 ${s.bg} border-l-2 ${s.border}`}>
                                        <span className="text-2xl mt-0.5 flex-shrink-0">{TYPE_ICON[a.type] || '⚠️'}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="text-sm font-bold text-white">{a.title}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${s.bg} ${s.border} ${s.text}`}>{a.severity.toUpperCase()}</span>
                                                <span className="text-xs text-slate-500">{a.period}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{a.message}</p>
                                        </div>
                                        <button onClick={() => dismiss(a._id)}
                                            className="text-slate-600 hover:text-slate-300 text-lg flex-shrink-0 transition-colors" title="Dismiss">×</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* .env setup guide */}
                <div className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-5">
                    <h2 className="text-sm font-bold text-slate-300 mb-3">⚙️ Backend Configuration (.env)</h2>
                    <p className="text-xs text-slate-400 mb-3">Add these keys to <code className="text-indigo-400">Sdc/backend/.env</code> to enable real notifications:</p>
                    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-green-400 overflow-x-auto leading-relaxed">{`# Gmail (for email alerts)
GMAIL_USER=your.gmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # 16-char App Password from Google

# Twilio (for SMS alerts)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx         # Your Twilio number`}</pre>
                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">→ Gmail App Password guide</a>
                        <a href="https://www.twilio.com/try-twilio" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">→ Twilio free trial signup</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AlertSettings;
