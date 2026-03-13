import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';
import MetricsChangeSummary from '../components/MetricsChangeSummary';

const MetricsForm: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [isExisting, setIsExisting] = useState(false);
    const [prevForm, setPrevForm] = useState<any>(null);      // snapshot before edit
    const [summaryChanges, setSummaryChanges] = useState<any[] | null>(null); // popup data

    const emptyForm = {
        financial: { revenue: 0, monthlyExpenses: 0, burnRate: 0, cashOnHand: 0, runwayMonths: 0, totalFunding: 0, fundingAmount: 0, fundingType: 'None', investorName: '' },
        operational: { activeUsers: 0, newUsers: 0, cac: 0, ltv: 0, churnRate: 0, gmv: 0, citiesServed: 0 },
        innovation: { patentsFiled: 0, patentsGranted: 0, trademarksFiled: 0, rndSpend: 0 },
        impact: { directJobs: 0, womenEmployees: 0, ruralEmployees: 0, exportsInr: 0 }
    };
    const [form, setForm] = useState(emptyForm);

    // Helper: apply fetched data into form state
    const applyData = (d: any) => {
        setForm({
            financial: { ...emptyForm.financial, ...d.financial },
            operational: { ...emptyForm.operational, ...d.operational },
            innovation: { ...emptyForm.innovation, ...d.innovation },
            impact: { ...emptyForm.impact, ...d.impact }
        });
    };

    // On mount: load the latest metrics as the default pre-fill
    useEffect(() => {
        api.get('/metrics/latest').then(res => {
            if (res.data) applyData(res.data);
        }).catch(() => { }).finally(() => setLoaded(true));
    }, []);

    // When period changes: fetch that specific period's data (if it exists)
    useEffect(() => {
        if (!loaded) return;
        setLoaded(false);
        api.get(`/metrics/period/${period}`)
            .then(res => {
                if (res.data) {
                    const filled = {
                        financial: { ...emptyForm.financial, ...res.data.financial },
                        operational: { ...emptyForm.operational, ...res.data.operational },
                        innovation: { ...emptyForm.innovation, ...res.data.innovation },
                        impact: { ...emptyForm.impact, ...res.data.impact }
                    };
                    setForm(filled);
                    setPrevForm(filled);   // ← save snapshot for diff
                    setIsExisting(true);
                } else {
                    setForm(emptyForm);
                    setPrevForm(null);
                    setIsExisting(false);
                }
            })
            .catch(() => { setIsExisting(false); })
            .finally(() => setLoaded(true));
    }, [period]);

    // Auto-calculate Burn Rate AND Runway from Cash on Hand
    useEffect(() => {
        if (!loaded) return;
        const expenses = form.financial.monthlyExpenses;
        const revenue  = form.financial.revenue;
        const burnRate = Math.max(0, expenses - revenue); // burn = expenses − revenue
        const cash     = form.financial.cashOnHand;
        // runway = cash on hand / burn rate (only when burning money)
        const runwayMonths = burnRate > 0 ? Math.round(cash / burnRate) : (cash > 0 ? 999 : 0);

        setForm(prev => ({
            ...prev,
            financial: { ...prev.financial, burnRate, runwayMonths }
        }));
    }, [form.financial.monthlyExpenses, form.financial.revenue, form.financial.cashOnHand, loaded]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/metrics', { period, ...form });
            // Build change list for popup
            const prev = prevForm;
            const METRIC_DEFS: { label: string; path: [string, string]; format?: 'currency'|'percent'|'number'; unit?: string; higherIsBetter?: boolean }[] = [
                { label: 'Revenue',      path: ['financial','revenue'],       format: 'currency', higherIsBetter: true  },
                { label: 'Expenses',     path: ['financial','monthlyExpenses'],format: 'currency', higherIsBetter: false },
                { label: 'Cash on Hand', path: ['financial','cashOnHand'],    format: 'currency', higherIsBetter: true  },
                { label: 'Burn Rate',    path: ['financial','burnRate'],      format: 'currency', higherIsBetter: false },
                { label: 'Runway',       path: ['financial','runwayMonths'],  unit: 'mo',         higherIsBetter: true  },
                { label: 'Total Funding',path: ['financial','totalFunding'],  format: 'currency', higherIsBetter: true  },
                { label: 'Active Users', path: ['operational','activeUsers'], higherIsBetter: true  },
                { label: 'New Users',    path: ['operational','newUsers'],    higherIsBetter: true  },
                { label: 'Churn Rate',   path: ['operational','churnRate'],   format: 'percent',  higherIsBetter: false },
                { label: 'CAC',          path: ['operational','cac'],         format: 'currency', higherIsBetter: false },
                { label: 'LTV',          path: ['operational','ltv'],         format: 'currency', higherIsBetter: true  },
                { label: 'Cities',       path: ['operational','citiesServed'],higherIsBetter: true  },
                { label: 'R&D Spend',    path: ['innovation','rndSpend'],     format: 'currency', higherIsBetter: true  },
                { label: 'Direct Jobs',  path: ['impact','directJobs'],       higherIsBetter: true  },
            ];
            const changes = METRIC_DEFS
                .map(m => ({
                    label: m.label,
                    from: prev ? (prev as any)[m.path[0]][m.path[1]] ?? 0 : 0,
                    to: (form as any)[m.path[0]][m.path[1]] ?? 0,
                    format: m.format,
                    unit: m.unit,
                    higherIsBetter: m.higherIsBetter,
                }))
                .filter(c => c.from !== c.to);  // only changed metrics
            setSummaryChanges(changes.length > 0 ? changes : []);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to submit');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (section: string, field: string, value: string) => {
        const num = field === 'fundingType' || field === 'investorName' ? value : Math.max(0, Number(value));
        setForm(prev => ({
            ...prev,
            [section]: { ...(prev as any)[section], [field]: num }
        }));
    };

    const inputClass = "w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all";
    const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1";

    const sections = [
        {
            key: 'financial', title: '💰 Financial Metrics', fields: [
                { key: 'revenue',        label: 'Revenue (₹)',         type: 'number' },
                { key: 'monthlyExpenses',label: 'Expenses (₹)',        type: 'number' },
                { key: 'cashOnHand',     label: 'Cash on Hand (₹)',    type: 'number' },
                { key: 'burnRate',       label: 'Burn Rate (₹) ⚡',   type: 'number', readOnly: true },
                { key: 'runwayMonths',   label: 'Runway (months) ⚡',  type: 'number', readOnly: true },
                { key: 'totalFunding',   label: 'Total Funding (₹)',   type: 'number' },
                { key: 'fundingAmount',  label: 'Month Funding (₹)',   type: 'number' },
                { key: 'fundingType',    label: 'Funding Type',        type: 'select', options: ['None', 'Equity', 'Debt', 'Grant'] },
                { key: 'investorName',   label: 'Investor Name',       type: 'text' },
            ]
        },
        {
            key: 'operational', title: '⚙️ Operational Metrics', fields: [
                { key: 'activeUsers', label: 'Active Users', type: 'number' },
                { key: 'newUsers', label: 'New Users', type: 'number' },
                { key: 'churnRate', label: 'Churn Rate (%)', type: 'number' },
                { key: 'cac', label: 'CAC (₹)', type: 'number' },
                { key: 'ltv', label: 'LTV (₹)', type: 'number' },
                { key: 'gmv', label: 'GMV (₹)', type: 'number' },
                { key: 'citiesServed', label: 'Cities Served', type: 'number' },
            ]
        },
        {
            key: 'innovation', title: '💡 Innovation Metrics', fields: [
                { key: 'patentsFiled', label: 'Patents Filed', type: 'number' },
                { key: 'patentsGranted', label: 'Patents Granted', type: 'number' },
                { key: 'trademarksFiled', label: 'Trademarks Filed', type: 'number' },
                { key: 'rndSpend', label: 'R&D Spend (₹)', type: 'number' },
            ]
        },
        {
            key: 'impact', title: '🌍 Impact Metrics', fields: [
                { key: 'directJobs', label: 'Direct Jobs', type: 'number' },
                { key: 'womenEmployees', label: 'Women Employees', type: 'number' },
                { key: 'ruralEmployees', label: 'Rural Employees', type: 'number' },
                { key: 'exportsInr', label: 'Exports (₹)', type: 'number' },
            ]
        },
    ];

    return (
        <>
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">📝 Submit Metrics</h1>
                        <p className="text-sm text-slate-400 mt-1">Enter or update your monthly startup metrics</p>
                    </div>
                    {isExisting && (
                        <span className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold">
                            ✏️ Editing existing record
                        </span>
                    )}
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Period selector */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="max-w-xs">
                                <label className={labelClass}>Reporting Period</label>
                                <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inputClass} />
                            </div>
                            {!loaded && (
                                <span className="text-xs text-slate-400 mt-4 animate-pulse">Loading period data…</span>
                            )}
                        </div>
                    </div>

                    {/* Metric Sections */}
                    {sections.map(section => (
                        <div key={section.key} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6 mb-4">
                            <h3 className="text-base font-semibold text-white mb-4">{section.title}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {section.fields.map(f => (
                                    <div key={f.key}>
                                        <label className={labelClass}>{f.label}</label>
                                        {f.type === 'select' ? (
                                            <select
                                                value={(form as any)[section.key][f.key]}
                                                onChange={e => updateField(section.key, f.key, e.target.value)}
                                                className={inputClass}
                                            >
                                                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                            </select>
                                        ) : f.type === 'text' ? (
                                            <input
                                                type="text"
                                                value={(form as any)[section.key][f.key]}
                                                onChange={e => updateField(section.key, f.key, e.target.value)}
                                                className={inputClass}
                                            />
                                        ) : (
                                            <input
                                                type="number"
                                                min="0"
                                                step={f.key === 'churnRate' ? '0.1' : '1'}
                                                value={(form as any)[section.key][f.key]}
                                                onChange={e => !(f as any).readOnly && updateField(section.key, f.key, e.target.value)}
                                                readOnly={(f as any).readOnly}
                                                className={`${inputClass} ${(f as any).readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end gap-3 mt-2">
                        <button type="button" onClick={() => navigate('/dashboard')}
                            className="px-5 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving}
                            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                            {saving ? 'Saving…' : '📊 Submit & Calculate Score'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        {summaryChanges !== null && (
            <MetricsChangeSummary
                changes={summaryChanges!}
                period={period}
                isUpdate={isExisting}
                onDone={() => { setSummaryChanges(null); navigate('/dashboard'); }}
            />
        )}
        </>
    );
};

export default MetricsForm;
