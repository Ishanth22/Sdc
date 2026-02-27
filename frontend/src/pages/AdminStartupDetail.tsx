import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';
import ScoreGauge from '../components/ScoreGauge';

const AdminStartupDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/startup/${id}`)
            .then(res => setData(res.data))
            .finally(() => setLoading(false));
    }, [id]);

    const formatINR = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

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

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-950">
                <Navbar />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <p className="text-slate-400">Startup not found.</p>
                </div>
            </div>
        );
    }

    const { startup, metrics, scores } = data;
    const latestScore = scores[scores.length - 1];
    const scoreTrend = scores.map((s: any) => ({ period: s.period, score: s.score }));
    const revTrend = [...metrics].reverse().map((m: any) => ({ period: m.period, revenue: Math.round(m.financial.revenue / 100000) }));

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back */}
                <button onClick={() => navigate('/admin')} className="text-sm text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
                    ← Back to Admin
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{startup.companyName}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-full text-xs font-semibold">{startup.sector}</span>
                            <span className="px-2.5 py-0.5 bg-violet-500/15 text-violet-300 rounded-full text-xs font-semibold">{startup.stage}</span>
                            <span className="text-xs text-slate-500">{startup.city} · Team: {startup.teamSize}</span>
                        </div>
                        {startup.website && (
                            <a href={startup.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 mt-1 inline-block">{startup.website}</a>
                        )}
                    </div>
                    <ScoreGauge score={latestScore?.score || 0} size={140} />
                </div>

                {/* Score components */}
                {latestScore && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {Object.entries(latestScore.components).map(([key, val]) => (
                            <div key={key} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-4">
                                <p className="text-xs text-slate-500 uppercase mb-1">{key}</p>
                                <p className="text-xl font-bold text-white">{val as number}</p>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${val as number}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Risk Flags */}
                {latestScore?.riskFlags?.length > 0 && (
                    <div className="mb-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                        <h3 className="text-sm font-semibold text-amber-300 mb-2">⚠️ Risk Flags</h3>
                        <ul className="space-y-1">
                            {latestScore.riskFlags.map((f: string, i: number) => (
                                <li key={i} className="text-sm text-amber-200/80">• {f}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Score Trend</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={scoreTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={revTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Metrics Table */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800/30">
                        <h3 className="text-sm font-semibold text-white">All Metrics</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-indigo-500/5">
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Period</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Revenue</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Burn</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Runway</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Users</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">CAC</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">LTV</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Jobs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.map((m: any) => (
                                    <tr key={m._id} className="border-t border-slate-800/20 hover:bg-indigo-500/5">
                                        <td className="px-4 py-3 text-sm text-white font-medium">{m.period}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{formatINR(m.financial.revenue)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{formatINR(m.financial.burnRate)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{m.financial.runwayMonths}mo</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{m.operational.activeUsers.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{formatINR(m.operational.cac)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{formatINR(m.operational.ltv)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{m.impact.directJobs}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminStartupDetail;
