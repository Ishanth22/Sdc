import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';
import ScoreGauge from '../components/ScoreGauge';

const EXPENSE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

const Dashboard: React.FC = () => {
    const [profile, setProfile] = useState<any>(null);
    const [score, setScore] = useState<any>(null);
    const [metrics, setMetrics] = useState<any[]>([]);
    const [benchmark, setBenchmark] = useState<any>(null);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [profileRes, scoreRes, metricsRes, bmRes, alertsRes] = await Promise.all([
                api.get('/startup/profile'),
                api.get('/score/current'),
                api.get('/metrics/history'),
                api.get('/benchmark').catch(() => ({ data: null })),
                api.get('/alerts').catch(() => ({ data: [] }))
            ]);
            setProfile(profileRes.data);
            setScore(scoreRes.data);
            setMetrics(metricsRes.data);
            setBenchmark(bmRes.data);
            setAlerts(alertsRes.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const dismissAlert = async (id: string) => {
        try {
            await api.put(`/alerts/${id}/dismiss`);
            setAlerts(prev => prev.filter(a => a._id !== id));
        } catch (err) { console.error(err); }
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
        revenue: Math.round(m.financial.revenue / 100000),
    }));
    const userData = [...metrics].reverse().map(m => ({
        period: m.period,
        users: m.operational.activeUsers,
        newUsers: m.operational.newUsers,
    }));
    const burnTrendData = [...metrics].reverse().map(m => ({
        period: m.period,
        burnRate: Math.round(m.financial.burnRate / 100000),
        revenue: Math.round(m.financial.revenue / 100000),
    }));
    const expenseVsRevData = [...metrics].reverse().map(m => ({
        period: m.period,
        revenue: Math.round(m.financial.revenue / 100000),
        expenses: Math.round((m.financial.monthlyExpenses || m.financial.burnRate) / 100000),
    }));

    // Expense distribution pie chart data
    const expensePieData = latest ? [
        { name: 'Operations', value: Math.round((latest.financial.burnRate || 0) * 0.35) },
        { name: 'Salaries', value: Math.round((latest.financial.burnRate || 0) * 0.30) },
        { name: 'R&D', value: latest.innovation.rndSpend || 0 },
        { name: 'Marketing', value: Math.round(latest.operational.cac * (latest.operational.newUsers || 0)) },
        { name: 'Infrastructure', value: Math.round((latest.financial.burnRate || 0) * 0.10) },
        { name: 'Other', value: Math.round((latest.financial.burnRate || 0) * 0.05) },
    ].filter(d => d.value > 0) : [];

    const formatINR = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'bg-green-500/15 text-green-400 border-green-500/30';
            case 'Moderate': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            case 'High': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
            case 'Critical': return 'bg-red-500/15 text-red-400 border-red-500/30';
            default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
        }
    };

    // Auto-calculate growth rates
    const prevMetrics = metrics[1];
    const revenueGrowthRate = prevMetrics && prevMetrics.financial.revenue > 0
        ? Math.round(((latest?.financial.revenue - prevMetrics.financial.revenue) / prevMetrics.financial.revenue) * 100) : null;
    const userGrowthRate = prevMetrics && prevMetrics.operational.activeUsers > 0
        ? Math.round(((latest?.operational.activeUsers - prevMetrics.operational.activeUsers) / prevMetrics.operational.activeUsers) * 100) : null;

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
                            {/* Risk Level Badge */}
                            {score?.riskLevel && (
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(score.riskLevel)}`}>
                                    {score.riskLevel === 'Low' ? '🟢' : score.riskLevel === 'Moderate' ? '🟡' : score.riskLevel === 'High' ? '🟠' : '🔴'} {score.riskLevel} Risk
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Funding Readiness */}
                        {score?.fundingReadiness !== undefined && (
                            <div className="text-center">
                                <p className="text-xs text-slate-500 mb-1">Funding Ready</p>
                                <div className={`text-xl font-bold ${score.fundingReadiness >= 70 ? 'text-green-400' : score.fundingReadiness >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {score.fundingReadiness}%
                                </div>
                            </div>
                        )}
                        <div className="flex-shrink-0">
                            <ScoreGauge score={score?.score || 0} size={160} />
                            <p className="text-center text-xs text-slate-500 mt-1">Health Score</p>
                        </div>
                    </div>
                </div>

                {/* Score Explanation */}
                {score?.explanation && score.explanation.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-4 mb-6">
                        <div className="space-y-1">
                            {score.explanation.map((exp: string, i: number) => (
                                <p key={i} className={`text-sm ${i === 0 ? 'font-semibold text-white' : 'text-slate-400'}`}>{exp}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Score Component Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {[
                        { label: 'Revenue Growth', value: score?.components?.revenueGrowth || score?.components?.financial || 0, color: 'from-green-500 to-emerald-600', emoji: '📈', weight: '25%' },
                        { label: 'User Growth', value: score?.components?.userGrowth || score?.components?.operational || 0, color: 'from-cyan-500 to-blue-600', emoji: '👥', weight: '20%' },
                        { label: 'Burn Efficiency', value: score?.components?.burnEfficiency || score?.components?.innovation || 0, color: 'from-violet-500 to-purple-600', emoji: '🔥', weight: '20%' },
                        { label: 'Churn Stability', value: score?.components?.churnStability || score?.components?.impact || 0, color: 'from-amber-500 to-orange-600', emoji: '🔄', weight: '15%' },
                        { label: 'Runway Stability', value: score?.components?.runwayStability || 0, color: 'from-pink-500 to-rose-600', emoji: '🛫', weight: '20%' },
                    ].map(comp => (
                        <div key={comp.label} className="bg-slate-900/70 backdrop-blur-sm border border-slate-800/50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base">{comp.emoji}</span>
                                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{comp.label}</span>
                                </div>
                                <span className="text-[10px] text-slate-600">{comp.weight}</span>
                            </div>
                            <div className="text-xl font-bold text-white mb-2">{comp.value}</div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className={`h-full bg-gradient-to-r ${comp.color} rounded-full transition-all duration-1000`}
                                    style={{ width: `${comp.value}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                    {[
                        { label: 'Revenue', value: latest ? formatINR(latest.financial.revenue) : '—', sub: '/month', badge: revenueGrowthRate !== null ? `${revenueGrowthRate > 0 ? '+' : ''}${revenueGrowthRate}%` : null, badgeColor: (revenueGrowthRate || 0) > 0 ? 'text-green-400' : 'text-red-400' },
                        { label: 'Burn Rate', value: latest ? formatINR(latest.financial.burnRate) : '—', sub: '/month', badge: null, badgeColor: '' },
                        { label: 'Runway', value: latest ? `${latest.financial.runwayMonths} mo` : '—', sub: (latest?.financial.runwayMonths || 0) < 6 ? '⚠️ Low' : '', badge: null, badgeColor: '' },
                        { label: 'Active Users', value: latest ? latest.operational.activeUsers.toLocaleString() : '—', sub: '', badge: userGrowthRate !== null ? `${userGrowthRate > 0 ? '+' : ''}${userGrowthRate}%` : null, badgeColor: (userGrowthRate || 0) > 0 ? 'text-green-400' : 'text-red-400' },
                        { label: 'Churn Rate', value: latest ? `${latest.operational.churnRate || 0}%` : '—', sub: (latest?.operational.churnRate || 0) > 10 ? '⚠️ High' : '', badge: null, badgeColor: '' },
                        { label: 'LTV/CAC', value: latest && latest.operational.cac > 0 ? `${(latest.operational.ltv / latest.operational.cac).toFixed(1)}x` : '—', sub: latest && latest.operational.ltv / latest.operational.cac < 3 ? '⚠️ < 3x' : '', badge: null, badgeColor: '' },
                    ].map(kpi => (
                        <div key={kpi.label} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-4 hover:border-indigo-500/20 transition-all">
                            <p className="text-xs text-slate-500 font-medium mb-1">{kpi.label}</p>
                            <div className="flex items-baseline gap-1">
                                <p className="text-lg font-bold text-white">{kpi.value}</p>
                                {kpi.badge && <span className={`text-xs font-semibold ${kpi.badgeColor}`}>{kpi.badge}</span>}
                            </div>
                            {kpi.sub && <span className="text-xs text-slate-500">{kpi.sub}</span>}
                        </div>
                    ))}
                </div>

                {/* Charts Row 1: Revenue + User Growth */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">📈 Revenue Growth Trend (₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#818cf8' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#818cf8" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#818cf8', r: 4 }} activeDot={{ r: 6 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">👥 User Growth</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={userData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }} />
                                <Bar dataKey="users" fill="#6366f1" radius={[4, 4, 0, 0]} name="Active Users" />
                                <Bar dataKey="newUsers" fill="#06b6d4" radius={[4, 4, 0, 0]} name="New Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Charts Row 2: Expense vs Revenue + Burn Rate Trend */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">💰 Revenue vs Expenses (₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={expenseVsRevData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }} />
                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                                <Bar dataKey="expenses" fill="#f97316" radius={[4, 4, 0, 0]} name="Expenses" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">🔥 Burn Rate Trend (₹ Lakhs)</h3>
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={burnTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#1e293b' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="burnRate" stroke="#f97316" strokeWidth={2.5} dot={{ fill: '#f97316', r: 4 }} name="Burn Rate" />
                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#10b981', r: 3 }} name="Revenue" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Charts Row 3: Expense Pie + Benchmark */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Expense Distribution Pie */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">🥧 Expense Distribution</h3>
                        {expensePieData.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                            {expensePieData.map((_: any, idx: number) => (
                                                <Cell key={idx} fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                                            formatter={(value: number) => formatINR(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {expensePieData.map((d: any, i: number) => (
                                        <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                                            {d.name}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No expense data available.</p>
                        )}
                    </div>

                    {/* Benchmark */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">📊 Startup vs Industry Average</h3>
                        {benchmark?.benchmark ? (
                            <div className="space-y-3">
                                {[
                                    { label: 'Revenue', own: latest?.financial.revenue, avg: benchmark.benchmark.avgRevenue, unit: '₹', lower: false },
                                    { label: 'Burn Rate', own: latest?.financial.burnRate, avg: benchmark.benchmark.avgBurnRate, unit: '₹', lower: true },
                                    { label: 'CAC', own: latest?.operational.cac, avg: benchmark.benchmark.avgCac, unit: '₹', lower: true },
                                    { label: 'LTV', own: latest?.operational.ltv, avg: benchmark.benchmark.avgLtv, unit: '₹', lower: false },
                                    { label: 'Active Users', own: latest?.operational.activeUsers, avg: benchmark.benchmark.avgActiveUsers, unit: '', lower: false },
                                ].map(item => {
                                    const diff = item.avg > 0 ? ((item.own - item.avg) / item.avg * 100) : 0;
                                    const isGood = item.lower ? diff < 0 : diff > 0;
                                    const maxVal = Math.max(item.own || 0, item.avg || 0) || 1;
                                    return (
                                        <div key={item.label}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-slate-400">{item.label}</span>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isGood ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="flex gap-1 items-center">
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${((item.own || 0) / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] text-indigo-400 w-8">You</span>
                                            </div>
                                            <div className="flex gap-1 items-center mt-0.5">
                                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-600 rounded-full" style={{ width: `${((item.avg || 0) / maxVal) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] text-slate-500 w-8">Avg</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No benchmark data available yet. Submit metrics to see comparisons.</p>
                        )}
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-white mb-4">🔔 Smart Alerts</h3>
                    {alerts.length > 0 ? (
                        <div className="space-y-3">
                            {alerts.map((alert: any) => (
                                <div key={alert._id}
                                    className={`flex items-start gap-3 p-4 rounded-lg border ${alert.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}
                                >
                                    <span className="text-xl mt-0.5">
                                        {alert.severity === 'critical' ? '🚨' : '⚠️'}
                                    </span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className={`text-sm font-semibold ${alert.severity === 'critical' ? 'text-red-300' : 'text-amber-200'}`}>
                                                {alert.title}
                                            </p>
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">{alert.message}</p>
                                        <p className="text-[10px] text-slate-600 mt-1">Period: {alert.period}</p>
                                    </div>
                                    <button onClick={() => dismissAlert(alert._id)}
                                        className="text-xs text-slate-500 hover:text-slate-300 transition-all px-2 py-1">
                                        Dismiss
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                            <span className="text-green-400 text-lg">✅</span>
                            <p className="text-sm text-green-300">No active alerts. Your startup looks healthy!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
