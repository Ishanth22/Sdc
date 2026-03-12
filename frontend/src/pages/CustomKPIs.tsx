import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#ec4899'];
const PRESET_FORMULAS = [
    { name: 'Revenue per User', formula: 'revenue / users', unit: '₹' },
    { name: 'Burn Multiple', formula: 'burnrate / revenue', unit: 'x' },
    { name: 'LTV/CAC Ratio', formula: 'ltv / cac', unit: 'x' },
    { name: 'Gross Margin', formula: '(revenue - expenses) / revenue * 100', unit: '%' },
    { name: 'CAC Payback (months)', formula: 'cac / (revenue / users)', unit: 'mo' },
    { name: 'Net Revenue Retention', formula: '(revenue - (churn / 100 * revenue)) / revenue * 100', unit: '%' },
];
const VARIABLES = ['revenue', 'expenses', 'burnrate', 'runway', 'funding', 'users', 'newusers', 'churn', 'cac', 'ltv', 'rnd', 'jobs'];

const CustomKPIs: React.FC = () => {
    const [kpis, setKpis] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [formula, setFormula] = useState('');
    const [unit, setUnit] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { loadKPIs(); }, []);

    const loadKPIs = async () => {
        try {
            const res = await api.get('/custom-kpi');
            setKpis(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const createKPI = async () => {
        if (!name.trim() || !formula.trim()) return;
        setCreating(true);
        try {
            await api.post('/custom-kpi', { name, formula, unit, description });
            setName(''); setFormula(''); setUnit(''); setDescription('');
            setShowCreate(false);
            loadKPIs();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setCreating(false);
        }
    };

    const deleteKPI = async (id: string) => {
        await api.delete(`/custom-kpi/${id}`);
        setKpis(kpis.filter(k => k._id !== id));
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" /></div>
        </div>
    );

    if (error && kpis.length === 0) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <p className="text-red-400 font-medium">{error}</p>
                    {error.includes('plan') && <p className="text-sm text-slate-400 mt-2">Upgrade to Enterprise to use Custom KPI Builder.</p>}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/25">📐</div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Custom KPI Builder</h1>
                            <p className="text-sm text-slate-400">Define formula-based metrics and track them over time</p>
                        </div>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all">
                        {showCreate ? '✕ Cancel' : '+ New KPI'}
                    </button>
                </div>

                {/* Create Form */}
                {showCreate && (
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6 mb-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Create Custom KPI</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">KPI Name</label>
                                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Revenue per User" className="w-full mt-1 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">Unit</label>
                                <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="₹, %, x, months" className="w-full mt-1 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-emerald-500 outline-none" />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Formula</label>
                            <input value={formula} onChange={e => setFormula(e.target.value)} placeholder="e.g. revenue / users" className="w-full mt-1 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm font-mono focus:border-emerald-500 outline-none" />
                            <p className="text-[10px] text-slate-600 mt-1">Variables: {VARIABLES.join(', ')}</p>
                        </div>
                        {/* Presets */}
                        <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2">Quick Presets:</p>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_FORMULAS.map((p, i) => (
                                    <button key={i} onClick={() => { setName(p.name); setFormula(p.formula); setUnit(p.unit); }}
                                        className="px-2.5 py-1 bg-slate-800/60 border border-slate-700/40 rounded text-xs text-slate-400 hover:text-emerald-300 hover:border-emerald-500/30 transition-all">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs text-slate-400 uppercase tracking-wider">Description (optional)</label>
                            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this KPI measures..." className="w-full mt-1 px-3 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-emerald-500 outline-none" />
                        </div>
                        <button onClick={createKPI} disabled={creating || !name || !formula}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold text-sm rounded-lg hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all">
                            {creating ? 'Creating...' : '📐 Create KPI'}
                        </button>
                    </div>
                )}

                {/* KPI Cards */}
                {kpis.length === 0 && !showCreate ? (
                    <div className="text-center py-20 text-slate-600">
                        <p className="text-4xl mb-3">📐</p>
                        <p className="text-lg">No custom KPIs yet</p>
                        <p className="text-sm mt-1">Click "+ New KPI" to create your first custom metric</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {kpis.map((kpi, idx) => (
                            <div key={kpi._id} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-bold text-white">{kpi.name}</h4>
                                    <button onClick={() => deleteKPI(kpi._id)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">✕</button>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono mb-3">{kpi.formula} ({kpi.unit})</p>
                                {kpi.values.length > 0 ? (
                                    <>
                                        <div className="flex items-end gap-2 mb-3">
                                            <span className="text-2xl font-bold text-white">{kpi.values[kpi.values.length - 1]?.value.toFixed(2)}</span>
                                            <span className="text-sm text-slate-400">{kpi.unit}</span>
                                        </div>
                                        <ResponsiveContainer width="100%" height={140}>
                                            <LineChart data={kpi.values}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
                                                <Line type="monotone" dataKey="value" stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-600">No data available</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomKPIs;
