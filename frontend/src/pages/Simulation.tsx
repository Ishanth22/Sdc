import React, { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const Simulation: React.FC = () => {
    const [revenueChange, setRevenueChange] = useState(0);
    const [expenseChange, setExpenseChange] = useState(0);
    const [additionalFunding, setAdditionalFunding] = useState(0);
    const [churnChange, setChurnChange] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const simulate = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/simulation', {
                revenueChangePercent: revenueChange,
                expenseChangePercent: expenseChange,
                additionalFunding,
                churnChangePercent: churnChange
            });
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

    const radarData = result ? [
        { metric: 'Revenue', current: result.current.revenue / 10000, simulated: result.simulated.revenue / 10000 },
        { metric: 'Runway', current: Math.min(result.current.runway, 50), simulated: Math.min(result.simulated.runway, 50) },
        { metric: 'Score', current: result.current.score, simulated: result.simulated.score },
        { metric: 'Users', current: result.current.users / 100, simulated: result.simulated.users / 100 },
        { metric: 'Retention', current: 100 - result.current.churn, simulated: 100 - result.simulated.churn },
    ] : [];

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25">🔬</div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Scenario Simulation</h1>
                        <p className="text-sm text-slate-400">What-if analysis — see how changes impact your metrics</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                        <p className="text-red-400 text-sm">{error}</p>
                        {error.includes('plan') && <p className="text-xs text-slate-500 mt-1">Upgrade to Enterprise for scenario simulation.</p>}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Controls */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Adjust Parameters</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">Revenue Change</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input type="range" min={-50} max={100} value={revenueChange} onChange={e => setRevenueChange(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                                    <span className={`text-sm font-bold w-16 text-right ${revenueChange > 0 ? 'text-green-400' : revenueChange < 0 ? 'text-red-400' : 'text-white'}`}>{revenueChange > 0 ? '+' : ''}{revenueChange}%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">Expense Reduction</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input type="range" min={0} max={50} value={expenseChange} onChange={e => setExpenseChange(Number(e.target.value))} className="flex-1 accent-emerald-500" />
                                    <span className={`text-sm font-bold w-16 text-right ${expenseChange > 0 ? 'text-green-400' : 'text-white'}`}>-{expenseChange}%</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">Additional Funding (₹)</label>
                                <input type="number" value={additionalFunding} onChange={e => setAdditionalFunding(Number(e.target.value))} placeholder="e.g. 5000000" className="w-full mt-1 px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm focus:border-amber-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase tracking-wider">Churn Improvement</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input type="range" min={0} max={80} value={churnChange} onChange={e => setChurnChange(Number(e.target.value))} className="flex-1 accent-violet-500" />
                                    <span className={`text-sm font-bold w-16 text-right ${churnChange > 0 ? 'text-green-400' : 'text-white'}`}>-{churnChange}%</span>
                                </div>
                            </div>
                            <button onClick={simulate} disabled={loading} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" /> Simulating...</> : <>🔬 Run Simulation</>}
                            </button>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Current vs Simulated</h3>
                        {result ? (
                            <ResponsiveContainer width="100%" height={340}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#334155" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Radar name="Current" dataKey="current" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
                                    <Radar name="Simulated" dataKey="simulated" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-80 text-slate-600">
                                <p className="text-sm">Adjust the sliders and click "Run Simulation" to see results</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Comparison Table */}
                {result && (
                    <div className="mt-6 bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800/40 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Detailed Comparison</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${result.simulated.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400' : result.simulated.riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-400' : result.simulated.riskLevel === 'High' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                                Simulated Risk: {result.simulated.riskLevel}
                            </span>
                        </div>
                        <table className="w-full">
                            <thead>
                                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="text-left px-5 py-3">Metric</th>
                                    <th className="text-right px-5 py-3">Current</th>
                                    <th className="text-right px-5 py-3">Simulated</th>
                                    <th className="text-right px-5 py-3">Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.comparison.map((row: any, i: number) => (
                                    <tr key={i} className="border-t border-slate-800/30">
                                        <td className="px-5 py-3 text-sm text-white font-medium">{row.metric}</td>
                                        <td className="px-5 py-3 text-sm text-slate-400 text-right font-mono">
                                            {row.metric.includes('Rate') || row.metric.includes('Score') || row.metric.includes('Runway') ? row.current : fmt(row.current)}
                                        </td>
                                        <td className="px-5 py-3 text-sm text-white text-right font-mono font-semibold">
                                            {row.metric.includes('Rate') || row.metric.includes('Score') || row.metric.includes('Runway') ? row.simulated : fmt(row.simulated)}
                                        </td>
                                        <td className={`px-5 py-3 text-sm text-right font-mono font-semibold ${row.change.includes('+') ? 'text-green-400' : row.change.includes('-') ? 'text-red-400' : 'text-slate-400'}`}>
                                            {row.change}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Simulation;
