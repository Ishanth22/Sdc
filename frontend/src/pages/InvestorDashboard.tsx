import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const InvestorDashboard: React.FC = () => {
    const [startups, setStartups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [sortBy, setSortBy] = useState('score');
    const [compareIds, setCompareIds] = useState<string[]>([]);
    const [compareData, setCompareData] = useState<any[] | null>(null);
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await api.get(`/investor/startups?limit=100&sortBy=${sortBy}`);
            setStartups(res.data.startups);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const toggleCompare = (id: string) => {
        setCompareIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return [prev[1], id];
            return [...prev, id];
        });
    };

    const handleCompare = async () => {
        if (compareIds.length < 2) return;
        try {
            const res = await api.get(`/investor/compare?ids=${compareIds.join(',')}`);
            setCompareData(res.data);
            setShowCompare(true);
        } catch (err) { console.error(err); }
    };

    const formatINR = (num: number) => {
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
        return `₹${num.toLocaleString('en-IN')}`;
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'bg-green-500/15 text-green-400';
            case 'Moderate': return 'bg-amber-500/15 text-amber-400';
            case 'High': return 'bg-orange-500/15 text-orange-400';
            case 'Critical': return 'bg-red-500/15 text-red-400';
            default: return 'bg-slate-500/15 text-slate-400';
        }
    };

    const filtered = startups.filter(s => {
        if (searchTerm && !s.companyName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterSector && s.sector !== filterSector) return false;
        if (filterStage && s.stage !== filterStage) return false;
        return true;
    });

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
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">💼 Investor Dashboard</h1>
                        <p className="text-sm text-slate-400 mt-1">Discover and compare startup opportunities</p>
                    </div>
                    {compareIds.length === 2 && (
                        <button
                            onClick={handleCompare}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm rounded-lg hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            ⚖️ Compare Selected ({compareIds.length})
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <input
                        type="text" placeholder="Search startups..."
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm outline-none focus:border-indigo-500 w-64"
                    />
                    <select value={filterSector} onChange={e => setFilterSector(e.target.value)}
                        className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm outline-none focus:border-indigo-500">
                        <option value="">All Sectors</option>
                        {['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                        className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm outline-none focus:border-indigo-500">
                        <option value="">All Stages</option>
                        {['Idea', 'Seed', 'Early', 'Growth'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select value={sortBy} onChange={e => { setSortBy(e.target.value); loadData(); }}
                        className="px-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm outline-none focus:border-indigo-500">
                        <option value="score">Sort by Health Score</option>
                        <option value="funding">Sort by Funding Readiness</option>
                        <option value="revenue">Sort by Revenue</option>
                    </select>
                </div>

                {/* Compare Panel */}
                {showCompare && compareData && compareData.length === 2 && (
                    <div className="bg-slate-900/70 border border-indigo-500/20 rounded-2xl p-6 mb-8 animate-fade-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white">⚖️ Side-by-Side Comparison</h3>
                            <button onClick={() => { setShowCompare(false); setCompareIds([]); }}
                                className="text-xs text-slate-400 hover:text-red-400">✕ Close</button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {compareData.map((cd: any, idx: number) => (
                                <div key={idx} className={`bg-slate-800/40 rounded-xl p-5 border ${idx === 0 ? 'border-indigo-500/30' : 'border-violet-500/30'}`}>
                                    <h4 className="text-lg font-bold text-white mb-1">{cd.startup.companyName}</h4>
                                    <div className="flex gap-2 mb-3">
                                        <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 rounded-full text-xs">{cd.startup.sector}</span>
                                        <span className="px-2 py-0.5 bg-violet-500/15 text-violet-300 rounded-full text-xs">{cd.startup.stage}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><p className="text-xs text-slate-500">Health Score</p><p className="text-xl font-bold text-white">{cd.latestScore?.score || 0}</p></div>
                                        <div><p className="text-xs text-slate-500">Revenue</p><p className="text-sm font-medium text-white">{cd.latestMetrics ? formatINR(cd.latestMetrics.financial.revenue) : '—'}</p></div>
                                        <div><p className="text-xs text-slate-500">Users</p><p className="text-sm font-medium text-white">{cd.latestMetrics?.operational.activeUsers?.toLocaleString() || '—'}</p></div>
                                        <div><p className="text-xs text-slate-500">Runway</p><p className="text-sm font-medium text-white">{cd.latestMetrics?.financial.runwayMonths || '—'} mo</p></div>
                                        <div><p className="text-xs text-slate-500">Burn Rate</p><p className="text-sm font-medium text-white">{cd.latestMetrics ? formatINR(cd.latestMetrics.financial.burnRate) : '—'}</p></div>
                                        <div><p className="text-xs text-slate-500">Churn</p><p className="text-sm font-medium text-white">{cd.latestMetrics?.operational.churnRate || '—'}%</p></div>
                                        <div><p className="text-xs text-slate-500">Team</p><p className="text-sm font-medium text-white">{cd.startup.teamSize}</p></div>
                                        <div><p className="text-xs text-slate-500">City</p><p className="text-sm font-medium text-white">{cd.startup.city}</p></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Radar chart comparison */}
                        {compareData[0].latestScore && compareData[1].latestScore && (
                            <div className="bg-slate-800/30 rounded-xl p-4">
                                <h4 className="text-sm font-semibold text-white mb-3 text-center">Score Component Comparison</h4>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={[
                                        { metric: 'Revenue Growth', a: compareData[0].latestScore.components?.revenueGrowth || compareData[0].latestScore.components?.financial || 0, b: compareData[1].latestScore.components?.revenueGrowth || compareData[1].latestScore.components?.financial || 0 },
                                        { metric: 'User Growth', a: compareData[0].latestScore.components?.userGrowth || compareData[0].latestScore.components?.operational || 0, b: compareData[1].latestScore.components?.userGrowth || compareData[1].latestScore.components?.operational || 0 },
                                        { metric: 'Burn Efficiency', a: compareData[0].latestScore.components?.burnEfficiency || compareData[0].latestScore.components?.innovation || 0, b: compareData[1].latestScore.components?.burnEfficiency || compareData[1].latestScore.components?.innovation || 0 },
                                        { metric: 'Churn Stability', a: compareData[0].latestScore.components?.churnStability || compareData[0].latestScore.components?.impact || 0, b: compareData[1].latestScore.components?.churnStability || compareData[1].latestScore.components?.impact || 0 },
                                        { metric: 'Runway', a: compareData[0].latestScore.components?.runwayStability || 50, b: compareData[1].latestScore.components?.runwayStability || 50 },
                                    ]}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Radar name={compareData[0].startup.companyName} dataKey="a" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                                        <Radar name={compareData[1].startup.companyName} dataKey="b" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                                        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* Startup Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((s: any) => (
                        <div key={s._id}
                            className={`bg-slate-900/70 border rounded-xl p-5 hover:border-indigo-500/30 transition-all cursor-pointer ${compareIds.includes(s._id) ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : 'border-slate-800/50'}`}
                            onClick={() => toggleCompare(s._id)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="text-base font-bold text-white">{s.companyName}</h3>
                                    <div className="flex gap-2 mt-1">
                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-full text-xs">{s.sector}</span>
                                        <span className="px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded-full text-xs">{s.stage}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-bold ${s.latestScore >= 70 ? 'text-green-400' : s.latestScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {s.latestScore}
                                    </div>
                                    <p className="text-[10px] text-slate-500 uppercase">Health Score</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-slate-800/30 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-500">Revenue</p>
                                    <p className="text-sm font-semibold text-white">{formatINR(s.latestRevenue)}</p>
                                </div>
                                <div className="bg-slate-800/30 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-500">Users</p>
                                    <p className="text-sm font-semibold text-white">{(s.activeUsers || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-800/30 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-500">Runway</p>
                                    <p className="text-sm font-semibold text-white">{s.latestRunway} mo</p>
                                </div>
                                <div className="bg-slate-800/30 rounded-lg p-2">
                                    <p className="text-[10px] text-slate-500">Growth</p>
                                    <p className={`text-sm font-semibold ${s.revenueGrowth > 0 ? 'text-green-400' : s.revenueGrowth < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {s.revenueGrowth !== null ? `${s.revenueGrowth > 0 ? '+' : ''}${s.revenueGrowth}%` : '—'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRiskColor(s.riskLevel)}`}>
                                    {s.riskLevel} Risk
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Funding Ready:</span>
                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${s.fundingReadiness >= 70 ? 'bg-green-500' : s.fundingReadiness >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${s.fundingReadiness}%` }} />
                                    </div>
                                    <span className="text-xs text-white font-semibold">{s.fundingReadiness}%</span>
                                </div>
                            </div>

                            {compareIds.includes(s._id) && (
                                <div className="mt-2 text-center">
                                    <span className="text-xs text-indigo-400 font-semibold">✓ Selected for comparison</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InvestorDashboard;
