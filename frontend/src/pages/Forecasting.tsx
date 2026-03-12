import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

const Forecasting: React.FC = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/forecast')
            .then(res => setData(res.data))
            .catch(err => setError(err.response?.data?.error || err.message))
            .finally(() => setLoading(false));
    }, []);

    const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

    if (loading) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500" /></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                    <p className="text-red-400 font-medium">{error}</p>
                    {error.includes('plan') && <p className="text-sm text-slate-400 mt-2">Upgrade to Pro or Enterprise to access forecasting.</p>}
                </div>
            </div>
        </div>
    );

    if (!data) return null;

    /**
     * Split a flat [{period, value, type}] array into two series:
     * - actualValue  → filled for type='actual', plus one bridge point at the first forecast
     * - forecastValue → filled for type='forecast', plus one bridge point at the last actual
     * This lets Recharts render two <Line> elements with different strokeDasharray,
     * connected seamlessly at the boundary.
     */
    const buildDualSeries = (arr: any[]) => {
        const lastActualIdx = arr.reduce((acc: number, d: any, i: number) => d.type === 'actual' ? i : acc, -1);
        return arr.map((d: any, i: number) => ({
            period: d.period,
            actualValue: d.type === 'actual'
                ? d.value
                : (i === lastActualIdx + 1 ? arr[lastActualIdx]?.value : undefined),
            forecastValue: d.type === 'forecast'
                ? d.value
                : (i === lastActualIdx ? d.value : undefined),
        }));
    };

    const revData = buildDualSeries(data.revenueForecasts || []);
    const expData = buildDualSeries(data.expenseForecasts || []);
    const userDual = buildDualSeries(data.userForecasts || []);
    const runwayData = buildDualSeries(data.runwayForecasts || []);

    const tooltipStyle = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8 };
    const labelStyle = { color: '#94a3b8' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeFmt = (fn: (v: any) => string) => (v: any, name: any) =>
        [fn(v), name === 'actualValue' ? 'Actual' : '🤖 AI Forecast'] as [string, string];

    const ChartLegend = ({ color }: { color: string }) => (
        <div className="flex items-center gap-6 mt-3 justify-center">
            <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className="inline-block w-8 h-[2px] rounded" style={{ background: color }} />
                Actual Data
            </span>
            <span className="flex items-center gap-2 text-xs text-amber-400">
                <svg width="32" height="4" viewBox="0 0 32 4">
                    <line x1="0" y1="2" x2="32" y2="2" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="8 4" />
                </svg>
                AI Forecast
            </span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* ── Header ── */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/25">📈</div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Revenue & Runway Forecasting</h1>
                            <p className="text-sm text-slate-400">
                                {data.isAIPowered ? '🤖 AI-powered 6-month projections' : '6-month projections (rule-based fallback)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {data.isAIPowered && (
                            <span className="px-3 py-1 bg-purple-500/15 border border-purple-500/30 rounded-full text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                                🤖 AI-Enhanced
                            </span>
                        )}
                        {data.cachedAt && (
                            <span className="text-[10px] text-slate-600">
                                📦 Cached: {new Date(data.cachedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Runway Alert ── */}
                <div className={`rounded-xl p-5 mb-6 border ${data.projectedRunoutMonths <= 6 ? 'bg-red-500/10 border-red-500/30' : data.projectedRunoutMonths <= 12 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{data.projectedRunoutMonths <= 6 ? '🔴' : data.projectedRunoutMonths <= 12 ? '🟡' : '🟢'}</span>
                        <div>
                            <p className="text-white font-semibold text-lg">Projected to run out of funds in ~{data.projectedRunoutMonths} months</p>
                            <p className="text-sm text-slate-400">Estimated runway end: {data.projectedRunoutDate}</p>
                        </div>
                    </div>
                </div>

                {/* ── Sector Context + Confidence ── */}
                {data.sectorContext && (
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="px-3 py-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded-lg text-xs font-bold text-indigo-300 uppercase">🏢 {data.sectorContext.sector}</span>
                        <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg text-xs text-slate-300">📊 Stage: {data.sectorContext.stage}</span>
                        <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg text-xs text-slate-300">📈 Industry avg: {data.sectorContext.typicalGrowthRate?.toFixed(0)}%/mo</span>
                        <span className="px-3 py-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg text-xs text-slate-300">🔝 Growth cap: {data.sectorContext.growthCap?.toFixed(0)}%/mo</span>
                        {data.sectorContext.seasonalityFactor > 0 && (
                            <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">📅 Seasonal boost: +{data.sectorContext.seasonalityFactor}%</span>
                        )}
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${data.confidenceLevel === 'high' ? 'bg-green-500/15 text-green-300 border border-green-500/30' : data.confidenceLevel === 'medium' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'}`}>
                            {data.confidenceLevel === 'high' ? '✅' : data.confidenceLevel === 'medium' ? '⚠️' : '🔴'} Confidence: {data.confidenceLevel?.toUpperCase()}
                        </span>
                    </div>
                )}

                {/* ── Forecast Insights ── */}
                <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">🧠 Forecast Insights</h3>
                    <div className="space-y-2">
                        {data.insights.filter((i: string) => i && !i.startsWith('🤖')).map((insight: string, i: number) => (
                            <p key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                <span className="text-cyan-400 mt-0.5">→</span> {insight}
                            </p>
                        ))}
                    </div>
                </div>

                {/* ── AI Deep Insights ── */}
                {data.aiInsights && (
                    <div className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">🤖</span>
                            <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider">AI-Powered Deep Insights</h3>
                            <span className="px-2 py-0.5 bg-purple-500/20 rounded text-[9px] font-bold text-purple-400 uppercase">AI</span>
                        </div>
                        <div className="space-y-2">
                            {data.aiInsights.split('\n').filter(Boolean).map((insight: string, i: number) => (
                                <p key={i} className={`text-sm flex items-start gap-2 ${insight.startsWith('📊') || insight.startsWith('🎯') ? 'text-purple-200 font-medium mt-2' : 'text-slate-300'}`}>
                                    {!insight.startsWith('📊') && !insight.startsWith('🎯') && <span className="text-purple-400 mt-0.5">✦</span>}
                                    {insight}
                                </p>
                            ))}
                        </div>
                        {data.cachedAt && <p className="text-[10px] text-slate-600 mt-3 text-right">Auto-updates when your metrics data changes</p>}
                    </div>
                )}

                {/* ── Regulatory Risks ── */}
                {data.regulatoryRisks?.length > 0 && (
                    <div className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-5 mb-6">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">⚖️ Applicable Government Regulations ({data.regulatoryRisks.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.regulatoryRisks.map((risk: any, i: number) => (
                                <div key={i} className={`rounded-lg p-3 border ${risk.impact === 'opportunity' ? 'bg-green-500/5 border-green-500/20' : risk.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-800/30 border-slate-700/30'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-white truncate">{risk.regulation}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${risk.impact === 'opportunity' ? 'bg-green-500/20 text-green-300' : risk.severity === 'high' ? 'bg-red-500/20 text-red-300' : risk.severity === 'medium' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-400'}`}>
                                            {risk.impact === 'opportunity' ? '📈 Opportunity' : `${risk.severity} risk`}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-relaxed">{risk.description}</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Impact: {risk.impact === 'opportunity' ? '−' : '+'}{Math.abs(risk.estimatedImpactPercent)}% {risk.impact.replace('_', ' ')}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════ */}
                {/*  CHARTS — solid line = actual data, dashed amber = AI forecast */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Revenue Forecast */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-0.5">📈 Revenue Forecast</h3>
                        <p className="text-[10px] text-slate-600 mb-4">━ Actual &nbsp;┅ AI Forecast</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={revData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} width={65} />
                                <Tooltip formatter={makeFmt(fmt)} contentStyle={tooltipStyle} labelStyle={labelStyle} />
                                <Line type="monotone" dataKey="actualValue" name="actualValue"
                                    stroke="#06b6d4" strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }} connectNulls={false} />
                                <Line type="monotone" dataKey="forecastValue" name="forecastValue"
                                    stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 4"
                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <ChartLegend color="#06b6d4" />
                    </div>

                    {/* Expense Forecast */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-0.5">💸 Expense Forecast <span className="text-[10px] text-slate-600 ml-1">(incl. regulatory overhead)</span></h3>
                        <p className="text-[10px] text-slate-600 mb-4">━ Actual &nbsp;┅ AI Forecast</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={expData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tickFormatter={fmt} tick={{ fill: '#64748b', fontSize: 11 }} width={65} />
                                <Tooltip formatter={makeFmt(fmt)} contentStyle={tooltipStyle} labelStyle={labelStyle} />
                                <Line type="monotone" dataKey="actualValue" name="actualValue"
                                    stroke="#f43f5e" strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} connectNulls={false} />
                                <Line type="monotone" dataKey="forecastValue" name="forecastValue"
                                    stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 4"
                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <ChartLegend color="#f43f5e" />
                    </div>

                    {/* User Growth Forecast */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-0.5">👥 User Growth Forecast</h3>
                        <p className="text-[10px] text-slate-600 mb-4">━ Actual &nbsp;┅ AI Forecast</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={userDual}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip formatter={makeFmt((v: any) => v?.toLocaleString() ?? '')} contentStyle={tooltipStyle} labelStyle={labelStyle} />
                                <Line type="monotone" dataKey="actualValue" name="actualValue"
                                    stroke="#8b5cf6" strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 0 }} connectNulls={false} />
                                <Line type="monotone" dataKey="forecastValue" name="forecastValue"
                                    stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 4"
                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <ChartLegend color="#8b5cf6" />
                    </div>

                    {/* Runway Projection */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-white mb-0.5">🛫 Runway Projection (months)</h3>
                        <p className="text-[10px] text-slate-600 mb-4">━ Actual &nbsp;┅ AI Forecast &nbsp;— Red = danger zone</p>
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={runwayData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip formatter={makeFmt((v: any) => `${v} months`)} contentStyle={tooltipStyle} labelStyle={labelStyle} />
                                <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="5 5"
                                    label={{ value: '⚠️ Critical (6 mo)', fill: '#ef4444', fontSize: 10, position: 'insideTopLeft' }} />
                                <Line type="monotone" dataKey="actualValue" name="actualValue"
                                    stroke="#10b981" strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} connectNulls={false} />
                                <Line type="monotone" dataKey="forecastValue" name="forecastValue"
                                    stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="8 4"
                                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} connectNulls={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <ChartLegend color="#10b981" />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Forecasting;
