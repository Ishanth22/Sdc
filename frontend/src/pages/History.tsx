import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const History: React.FC = () => {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [scores, setScores] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/metrics/history'),
            api.get('/score/history')
        ]).then(([metricsRes, scoresRes]) => {
            setMetrics(metricsRes.data);
            setScores(scoresRes.data);
        }).finally(() => setLoading(false));
    }, []);

    const formatINR = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const scoreTrend = scores.map(s => ({ period: s.period, score: s.score }));

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950">
                <Navbar />
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-white mb-2">History & Trends</h1>
                <p className="text-sm text-slate-400 mb-6">View all your submitted metrics and score progression over time.</p>

                {/* Score Trend Chart */}
                {scoreTrend.length > 0 && (
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6 mb-8">
                        <h3 className="text-sm font-semibold text-white mb-4">Vitality Score Trend</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={scoreTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Metrics Table */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-indigo-500/5">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Burn Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Runway</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Users</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((m, i) => {
                                    const sc = scores.find(s => s.period === m.period);
                                    return (
                                        <tr key={m._id} className="border-t border-slate-800/30 hover:bg-indigo-500/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-white font-medium">{m.period}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{formatINR(m.financial.revenue)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{formatINR(m.financial.burnRate)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                <span className={m.financial.runwayMonths < 6 ? 'text-red-400' : ''}>{m.financial.runwayMonths} mo</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">{m.operational.activeUsers.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-bold ${sc && sc.score >= 60 ? 'text-green-400' : sc && sc.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                    {sc?.score || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelected(selected?._id === m._id ? null : m)}
                                                    className="text-xs text-indigo-400 hover:text-indigo-300"
                                                >
                                                    {selected?._id === m._id ? 'Hide' : 'View'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Panel */}
                {selected && (
                    <div className="mt-6 bg-slate-900/60 border border-indigo-500/20 rounded-xl p-6 animate-fade-in">
                        <h3 className="text-sm font-semibold text-white mb-4">Details for {selected.period}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-xs text-slate-500">Revenue</p><p className="text-sm text-white font-medium">{formatINR(selected.financial.revenue)}</p></div>
                            <div><p className="text-xs text-slate-500">Burn Rate</p><p className="text-sm text-white font-medium">{formatINR(selected.financial.burnRate)}</p></div>
                            <div><p className="text-xs text-slate-500">Funding</p><p className="text-sm text-white font-medium">{formatINR(selected.financial.fundingAmount)} ({selected.financial.fundingType})</p></div>
                            <div><p className="text-xs text-slate-500">Runway</p><p className="text-sm text-white font-medium">{selected.financial.runwayMonths} months</p></div>
                            <div><p className="text-xs text-slate-500">Active Users</p><p className="text-sm text-white font-medium">{selected.operational.activeUsers.toLocaleString()}</p></div>
                            <div><p className="text-xs text-slate-500">New Users</p><p className="text-sm text-white font-medium">{selected.operational.newUsers.toLocaleString()}</p></div>
                            <div><p className="text-xs text-slate-500">CAC</p><p className="text-sm text-white font-medium">{formatINR(selected.operational.cac)}</p></div>
                            <div><p className="text-xs text-slate-500">LTV</p><p className="text-sm text-white font-medium">{formatINR(selected.operational.ltv)}</p></div>
                            <div><p className="text-xs text-slate-500">Patents Filed</p><p className="text-sm text-white font-medium">{selected.innovation.patentsFiled}</p></div>
                            <div><p className="text-xs text-slate-500">R&D Spend</p><p className="text-sm text-white font-medium">{formatINR(selected.innovation.rndSpend)}</p></div>
                            <div><p className="text-xs text-slate-500">Direct Jobs</p><p className="text-sm text-white font-medium">{selected.impact.directJobs}</p></div>
                            <div><p className="text-xs text-slate-500">Women Employees</p><p className="text-sm text-white font-medium">{selected.impact.womenEmployees}</p></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default History;
