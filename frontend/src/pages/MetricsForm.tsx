import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Navbar from '../components/Navbar';

const MetricsForm: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        financial: { revenue: 0, monthlyExpenses: 0, burnRate: 0, runwayMonths: 0, totalFunding: 0, fundingAmount: 0, fundingType: 'None', investorName: '' },
        operational: { activeUsers: 0, newUsers: 0, cac: 0, ltv: 0, churnRate: 0, gmv: 0, citiesServed: 0 },
        innovation: { patentsFiled: 0, patentsGranted: 0, trademarksFiled: 0, rndSpend: 0 },
        impact: { directJobs: 0, womenEmployees: 0, ruralEmployees: 0, exportsInr: 0 }
    });

    useEffect(() => {
        api.get(`/metrics/latest`).then(res => {
            if (res.data) {
                const d = res.data;
                setForm({
                    financial: { ...form.financial, ...d.financial },
                    operational: { ...form.operational, ...d.operational },
                    innovation: { ...form.innovation, ...d.innovation },
                    impact: { ...form.impact, ...d.impact }
                });
            }
        }).catch(() => { });
    }, []);

    // Auto-calculate Burn Rate & Runway
    useEffect(() => {
        const expenses = form.financial.monthlyExpenses;
        const revenue = form.financial.revenue;
        const burnRate = expenses > 0 ? expenses - revenue : form.financial.burnRate;
        const totalFunding = form.financial.totalFunding;
        const runway = burnRate > 0 ? Math.round(totalFunding / burnRate) : form.financial.runwayMonths;

        setForm(prev => ({
            ...prev,
            financial: {
                ...prev.financial,
                burnRate: expenses > 0 ? Math.max(0, expenses) : prev.financial.burnRate,
                runwayMonths: expenses > 0 ? Math.max(0, runway) : prev.financial.runwayMonths
            }
        }));
    }, [form.financial.monthlyExpenses, form.financial.revenue, form.financial.totalFunding]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/metrics', { period, ...form });
            navigate('/dashboard');
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
                { key: 'revenue', label: 'Monthly Revenue (₹)', type: 'number' },
                { key: 'monthlyExpenses', label: 'Monthly Expenses (₹)', type: 'number' },
                { key: 'burnRate', label: 'Burn Rate (₹, auto-calc)', type: 'number' },
                { key: 'runwayMonths', label: 'Runway (months)', type: 'number' },
                { key: 'totalFunding', label: 'Total Funding Raised (₹)', type: 'number' },
                { key: 'fundingAmount', label: 'This Month Funding (₹)', type: 'number' },
                { key: 'fundingType', label: 'Funding Type', type: 'select', options: ['None', 'Equity', 'Debt', 'Grant'] },
                { key: 'investorName', label: 'Investor Name', type: 'text' },
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
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">📝 Submit Metrics</h1>
                        <p className="text-sm text-slate-400 mt-1">Enter your monthly startup metrics</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Period selector */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5 mb-6">
                        <div className="max-w-xs">
                            <label className={labelClass}>Reporting Period</label>
                            <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className={inputClass} />
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
                                                onChange={e => updateField(section.key, f.key, e.target.value)}
                                                className={inputClass}
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
    );
};

export default MetricsForm;
