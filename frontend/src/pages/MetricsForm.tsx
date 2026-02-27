import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';

const TABS = ['Financial', 'Operational', 'Innovation', 'Impact'] as const;

const MetricsForm: React.FC = () => {
    const [activeTab, setActiveTab] = useState<typeof TABS[number]>('Financial');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [scoreResult, setScoreResult] = useState<any>(null);
    const navigate = useNavigate();

    // Form data
    const [financial, setFinancial] = useState({
        revenue: '', burnRate: '', runwayMonths: '', fundingAmount: '', fundingType: 'None', investorName: ''
    });
    const [operational, setOperational] = useState({
        activeUsers: '', newUsers: '', cac: '', ltv: '', gmv: '', citiesServed: ''
    });
    const [innovation, setInnovation] = useState({
        patentsFiled: '', patentsGranted: '', trademarksFiled: '', rndSpend: ''
    });
    const [impact, setImpact] = useState({
        directJobs: '', womenEmployees: '', ruralEmployees: '', exportsInr: ''
    });

    // Pre-fill from latest metrics
    useEffect(() => {
        api.get('/metrics/latest').then(res => {
            if (res.data) {
                const m = res.data;
                setFinancial({
                    revenue: String(m.financial?.revenue || ''),
                    burnRate: String(m.financial?.burnRate || ''),
                    runwayMonths: String(m.financial?.runwayMonths || ''),
                    fundingAmount: String(m.financial?.fundingAmount || ''),
                    fundingType: m.financial?.fundingType || 'None',
                    investorName: m.financial?.investorName || ''
                });
                setOperational({
                    activeUsers: String(m.operational?.activeUsers || ''),
                    newUsers: String(m.operational?.newUsers || ''),
                    cac: String(m.operational?.cac || ''),
                    ltv: String(m.operational?.ltv || ''),
                    gmv: String(m.operational?.gmv || ''),
                    citiesServed: String(m.operational?.citiesServed || '')
                });
                setInnovation({
                    patentsFiled: String(m.innovation?.patentsFiled || ''),
                    patentsGranted: String(m.innovation?.patentsGranted || ''),
                    trademarksFiled: String(m.innovation?.trademarksFiled || ''),
                    rndSpend: String(m.innovation?.rndSpend || '')
                });
                setImpact({
                    directJobs: String(m.impact?.directJobs || ''),
                    womenEmployees: String(m.impact?.womenEmployees || ''),
                    ruralEmployees: String(m.impact?.ruralEmployees || ''),
                    exportsInr: String(m.impact?.exportsInr || '')
                });
            }
        }).catch(() => { });
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        setSuccess(false);
        try {
            const toNum = (obj: any) => {
                const result: any = {};
                for (const [k, v] of Object.entries(obj)) {
                    result[k] = typeof v === 'string' && !isNaN(Number(v)) && v !== '' ? Number(v) : v;
                }
                return result;
            };

            const res = await api.post('/metrics', {
                financial: toNum(financial),
                operational: toNum(operational),
                innovation: toNum(innovation),
                impact: toNum(impact)
            });
            setScoreResult(res.data.vitalityScore);
            setSuccess(true);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to submit metrics');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all";
    const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

    const Field = ({ label, value, onChange, placeholder, type = 'number' }: any) => (
        <div>
            <label className={labelClass}>{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-white mb-2">Submit Monthly Metrics</h1>
                <p className="text-sm text-slate-400 mb-6">Enter your startup's latest performance data. Submitting will recalculate your Vitality Score.</p>

                {success && scoreResult && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <p className="text-green-300 font-semibold mb-1">✅ Metrics submitted successfully!</p>
                        <p className="text-sm text-green-400">Your new Vitality Score: <span className="text-xl font-bold">{scoreResult.score}</span>/100</p>
                        {scoreResult.riskFlags.length > 0 && (
                            <p className="text-xs text-amber-400 mt-1">⚠️ Flags: {scoreResult.riskFlags.join(', ')}</p>
                        )}
                        <button onClick={() => navigate('/dashboard')} className="mt-2 text-sm text-indigo-400 hover:text-indigo-300">
                            ← Back to Dashboard
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 mb-6 bg-slate-900/50 rounded-xl p-1">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {tab === 'Financial' ? '💰' : tab === 'Operational' ? '⚙️' : tab === 'Innovation' ? '💡' : '🌍'} {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                    {activeTab === 'Financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Monthly Revenue (INR)" value={financial.revenue} onChange={(v: string) => setFinancial(p => ({ ...p, revenue: v }))} placeholder="e.g., 500000" />
                            <Field label="Burn Rate (INR/month)" value={financial.burnRate} onChange={(v: string) => setFinancial(p => ({ ...p, burnRate: v }))} placeholder="e.g., 300000" />
                            <Field label="Runway (months)" value={financial.runwayMonths} onChange={(v: string) => setFinancial(p => ({ ...p, runwayMonths: v }))} placeholder="e.g., 12" />
                            <Field label="Funding Raised This Month (INR)" value={financial.fundingAmount} onChange={(v: string) => setFinancial(p => ({ ...p, fundingAmount: v }))} placeholder="e.g., 5000000" />
                            <div>
                                <label className={labelClass}>Funding Type</label>
                                <select value={financial.fundingType} onChange={e => setFinancial(p => ({ ...p, fundingType: e.target.value }))} className={inputClass}>
                                    <option value="None">None</option>
                                    <option value="Equity">Equity</option>
                                    <option value="Debt">Debt</option>
                                    <option value="Grant">Grant</option>
                                </select>
                            </div>
                            <Field label="Investor Name" value={financial.investorName} onChange={(v: string) => setFinancial(p => ({ ...p, investorName: v }))} placeholder="e.g., Sequoia" type="text" />
                        </div>
                    )}

                    {activeTab === 'Operational' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Active Users" value={operational.activeUsers} onChange={(v: string) => setOperational(p => ({ ...p, activeUsers: v }))} placeholder="e.g., 10000" />
                            <Field label="New Users This Month" value={operational.newUsers} onChange={(v: string) => setOperational(p => ({ ...p, newUsers: v }))} placeholder="e.g., 1500" />
                            <Field label="CAC (INR)" value={operational.cac} onChange={(v: string) => setOperational(p => ({ ...p, cac: v }))} placeholder="e.g., 200" />
                            <Field label="LTV (INR)" value={operational.ltv} onChange={(v: string) => setOperational(p => ({ ...p, ltv: v }))} placeholder="e.g., 1200" />
                            <Field label="GMV (INR)" value={operational.gmv} onChange={(v: string) => setOperational(p => ({ ...p, gmv: v }))} placeholder="e.g., 5000000" />
                            <Field label="Cities Served" value={operational.citiesServed} onChange={(v: string) => setOperational(p => ({ ...p, citiesServed: v }))} placeholder="e.g., 12" />
                        </div>
                    )}

                    {activeTab === 'Innovation' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Patents Filed" value={innovation.patentsFiled} onChange={(v: string) => setInnovation(p => ({ ...p, patentsFiled: v }))} placeholder="e.g., 2" />
                            <Field label="Patents Granted" value={innovation.patentsGranted} onChange={(v: string) => setInnovation(p => ({ ...p, patentsGranted: v }))} placeholder="e.g., 1" />
                            <Field label="Trademarks Filed" value={innovation.trademarksFiled} onChange={(v: string) => setInnovation(p => ({ ...p, trademarksFiled: v }))} placeholder="e.g., 1" />
                            <Field label="R&D Spend (INR)" value={innovation.rndSpend} onChange={(v: string) => setInnovation(p => ({ ...p, rndSpend: v }))} placeholder="e.g., 200000" />
                        </div>
                    )}

                    {activeTab === 'Impact' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Direct Jobs Created" value={impact.directJobs} onChange={(v: string) => setImpact(p => ({ ...p, directJobs: v }))} placeholder="e.g., 50" />
                            <Field label="Women Employees" value={impact.womenEmployees} onChange={(v: string) => setImpact(p => ({ ...p, womenEmployees: v }))} placeholder="e.g., 20" />
                            <Field label="Rural Employees" value={impact.ruralEmployees} onChange={(v: string) => setImpact(p => ({ ...p, ruralEmployees: v }))} placeholder="e.g., 5" />
                            <Field label="Exports (INR)" value={impact.exportsInr} onChange={(v: string) => setImpact(p => ({ ...p, exportsInr: v }))} placeholder="e.g., 1000000" />
                        </div>
                    )}
                </div>

                {/* Submit */}
                <div className="flex justify-end mt-6 gap-3">
                    <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 transition-all">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Submitting…' : '📤 Submit Metrics'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MetricsForm;
