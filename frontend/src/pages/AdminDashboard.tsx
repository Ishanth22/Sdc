import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f97316', '#14b8a6', '#ef4444', '#84cc16'];

const AdminDashboard: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [stageData, setStageData] = useState<any>(null);
    const [heatmap, setHeatmap] = useState<any[]>([]);
    const [startups, setStartups] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSector, setFilterSector] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [sectorRes, stageRes, heatRes, startupRes] = await Promise.all([
                api.get('/admin/aggregates?by=sector'),
                api.get('/admin/aggregates?by=stage'),
                api.get('/admin/heatmap'),
                api.get('/admin/startups?limit=100')
            ]);
            setData(sectorRes.data);
            setStageData(stageRes.data);
            setHeatmap(heatRes.data);
            setStartups(startupRes.data.startups);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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

    const filteredStartups = startups.filter(s => {
        if (searchTerm && !s.companyName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (filterSector && s.sector !== filterSector) return false;
        return true;
    });

    const sectorPieData = data?.groups?.map((g: any) => ({ name: g.name, value: g.count })) || [];
    const stageBarData = stageData?.groups?.map((g: any) => ({ name: g.name, count: g.count })) || [];

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-white mb-2">🏛️ Admin Dashboard</h1>
                <p className="text-sm text-slate-400 mb-6">Ecosystem overview of all registered startups.</p>

                {/* Top Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Startups', value: data?.totals?.startups || 0, emoji: '🏢', color: 'text-indigo-400' },
                        { label: 'Total Jobs', value: (data?.totals?.jobs || 0).toLocaleString(), emoji: '👥', color: 'text-green-400' },
                        { label: 'Total Funding', value: formatINR(data?.totals?.funding || 0), emoji: '💰', color: 'text-amber-400' },
                        { label: 'Total Revenue', value: formatINR(data?.totals?.revenue || 0), emoji: '📈', color: 'text-pink-400' },
                    ].map(card => (
                        <div key={card.label} className="bg-slate-900/70 border border-slate-800/50 rounded-xl p-5 hover:border-indigo-500/20 transition-all">
                            <span className="text-2xl">{card.emoji}</span>
                            <p className={`text-2xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                            <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Sector Pie */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Sector Distribution</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={sectorPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                                    {sectorPieData.map((_: any, idx: number) => (
                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            {sectorPieData.map((d: any, i: number) => (
                                <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                    {d.name} ({d.value})
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Stage Bar */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Stage Distribution</h3>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={stageBarData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* City Heatmap Table */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6 mb-8">
                    <h3 className="text-sm font-semibold text-white mb-4">📍 Geographic Distribution (Top Cities)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {heatmap.slice(0, 8).map((city: any) => (
                            <div key={city.city} className="bg-slate-800/40 rounded-lg p-3 text-center hover:bg-slate-800/60 transition-all">
                                <p className="text-lg font-bold text-indigo-400">{city.count}</p>
                                <p className="text-xs text-slate-400">{city.city}</p>
                                <p className="text-xs text-slate-600">{city.totalTeam} employees</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Startup List */}
                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800/30 flex flex-wrap gap-3 items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Startup Registry</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                            />
                            <select
                                value={filterSector}
                                onChange={e => setFilterSector(e.target.value)}
                                className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                            >
                                <option value="">All Sectors</option>
                                {['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-indigo-500/5">
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Company</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Sector</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Stage</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">City</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Team</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Score</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Risk</th>
                                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStartups.map((s: any) => (
                                    <tr key={s._id} className="border-t border-slate-800/20 hover:bg-indigo-500/5 transition-colors">
                                        <td className="px-5 py-3.5 text-sm font-medium text-white">{s.companyName}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-full text-xs">{s.sector}</span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded-full text-xs">{s.stage}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{s.city}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{s.teamSize}</td>
                                        <td className="px-5 py-3.5">
                                            <span className={`text-sm font-bold ${s.latestScore >= 60 ? 'text-green-400' : s.latestScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                                {s.latestScore}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {s.riskFlags.length > 0 ? (
                                                <span className="text-xs text-amber-400">⚠️ {s.riskFlags.length}</span>
                                            ) : (
                                                <span className="text-xs text-green-400">✅</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() => navigate(`/admin/startup/${s._id}`)}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                            >
                                                View →
                                            </button>
                                        </td>
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

export default AdminDashboard;
