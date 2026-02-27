import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';
import ScoreGauge from '../components/ScoreGauge';

const Dashboard: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [score, setScore] = useState<any>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [benchmark, setBenchmark] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [profileRes, scoreRes, metricsRes, bmRes] = await Promise.all([
                api.get('/startup/profile'),
                api.get('/score/current'),
                api.get('/metrics/history'),
                api.get('/benchmark').catch(() => ({ data: null }))
            ]);
            setProfile(profileRes.data);
            setScore(scoreRes.data);
            setMetrics(metricsRes.data);
            setBenchmark(bmRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
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

    const latest = metrics[0];
    const revenueData = [...metrics].reverse().map(m => ({
        period: m.period,
        revenue: Math.round(m.financial.revenue / 100000), // in lakhs
    }));
    const userData = [...metrics].reverse().map(m => ({
        period: m.period,
        users: m.operational.activeUsers,
        newUsers: m.operational.newUsers,
    }));

    const formatINR = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">{profile?.companyName || 'My Startup'}</h1>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2.5 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-full text-xs font-semibold">{profile?.sector}</span>
                            <span className="px-2.5 py-0.5 bg-violet-500/15 text-violet-300 rounded-full text-xs font-semibold">{profile?.stage}</span>
                            <span className="text-xs text-slate-500">{profile?.city}</span>
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        <ScoreGauge score={score?.score || 0} size={160} />
                        <p className="text-center text-xs text-slate-500 mt-1">Vitality Score</p>
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Financial', value: score?.components?.financial || 0, color: 'from-green-500 to-emerald-600', emoji: '💰' },
                        { label: 'Operational', value: score?.components?.operational || 0, color: 'from-cyan-500 to-blue-600', emoji: '⚙️' },
                        { label: 'Innovation', value: score?.components?.innovation || 0, color: 'from-violet-500 to-purple-600', emoji: '💡' },
                        { label: 'Impact', value: score?.components?.impact || 0, color: 'from-amber-500 to-orange-600', emoji: '🌍' },
                    ].map(comp => (
                        <div key={comp.label} className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{comp.emoji}</span>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{comp.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-white mb-2">{comp.value}</div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-gradient-to-r ${comp.color} rounded-full transition-all duration-1000`}
                                    style={{ width: `${comp.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Revenue', value: latest ? formatINR(latest.financial.revenue) : '—', sub: '/month' },
                        { label: 'Burn Rate', value: latest ? formatINR(latest.financial.burnRate) : '—', sub: '/month' },
                        { label: 'Runway', value: latest ? `${latest.financial.runwayMonths} mo` : '—', sub: latest?.financial.runwayMonths < 6 ? '⚠️ Low' : '' },
                        { label: 'Active Users', value: latest ? latest.operational.activeUsers.toLocaleString() : '—', sub: '' },
                        { label: 'CAC/LTV', value: latest && latest.operational.cac > 0 ? `${(latest.operational.ltv / latest.operational.cac).toFixed(1)}x` : '—', sub: latest && latest.operational.ltv / latest.operational.cac < 3 ? '⚠️ < 3x' : '' },
                    ].map(kpi => (
                        <div key={kpi.label} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-4 hover:border-indigo-500/20 transition-all">
                            <p className="text-xs text-slate-500 font-medium mb-1">{kpi.label}</p>
                            <p className="text-xl font-bold text-white">{kpi.value}<span className="text-xs text-slate-500 ml-1">{kpi.sub}</span></p>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Trend */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Revenue Trend (₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    itemStyle={{ color: '#818cf8' }}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* User Growth */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">User Growth</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={userData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} name="Active Users" />
                                <Bar dataKey="newUsers" fill="#06b6d4" radius={[4, 4, 0, 0]} name="New Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Benchmark & Alerts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Benchmark */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">📊 Benchmark vs Sector Average</h3>
                        {benchmark?.benchmark ? (
                            <div className="space-y-3">
                                {[
                                    { label: 'CAC', own: latest?.operational.cac, avg: benchmark.benchmark.avgCac, unit: '₹', lower: true },
                                    { label: 'LTV', own: latest?.operational.ltv, avg: benchmark.benchmark.avgLtv, unit: '₹', lower: false },
                                    { label: 'Revenue', own: latest?.financial.revenue, avg: benchmark.benchmark.avgRevenue, unit: '₹', lower: false },
                                    { label: 'Burn Rate', own: latest?.financial.burnRate, avg: benchmark.benchmark.avgBurnRate, unit: '₹', lower: true },
                                ].map(item => {
                                    const diff = item.avg > 0 ? ((item.own - item.avg) / item.avg * 100) : 0;
                                    const isGood = item.lower ? diff < 0 : diff > 0;
                                    return (
                                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-800/30 last:border-0">
                                            <span className="text-sm text-slate-400">{item.label}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-white font-medium">{item.unit}{Math.round(item.own || 0).toLocaleString()}</span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isGood ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No benchmark data available yet. Submit metrics to see comparisons.</p>
                        )}
                    </div>

                    {/* Risk Alerts */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">⚠️ Alerts & Risk Flags</h3>
                        {score?.riskFlags && score.riskFlags.length > 0 ? (
                            <div className="space-y-3">
                                {score.riskFlags.map((flag: string, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                        <span className="text-amber-400 text-lg">⚠️</span>
                                        <div>
                                            <p className="text-sm text-amber-200 font-medium">{flag}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Flagged in period {score.period}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                                <span className="text-green-400 text-lg">✅</span>
                                <p className="text-sm text-green-300">No risk flags detected. Your startup looks healthy!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
