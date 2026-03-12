import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

const PROB_BG: Record<string, string> = { high: 'bg-red-500/15 border-red-500/30 text-red-300', medium: 'bg-amber-500/15 border-amber-500/30 text-amber-300', low: 'bg-green-500/15 border-green-500/30 text-green-300' };

const AIRiskDashboard: React.FC = () => {
    const [risk, setRisk] = useState<any>(null);
    const [bench, setBench] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'risk' | 'benchmark'>('risk');
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [riskRes, benchRes] = await Promise.all([
                api.get('/ai-risk/predict').catch(e => ({ data: null, error: e })),
                api.get('/ai-risk/benchmark').catch(e => ({ data: null, error: e }))
            ]);
            if (riskRes.data) setRisk(riskRes.data);
            if (benchRes.data) setBench(benchRes.data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRiskGradient = (score: number) => {
        if (score >= 70) return 'from-red-600 to-rose-500';
        if (score >= 40) return 'from-amber-600 to-orange-500';
        return 'from-green-600 to-emerald-500';
    };

    const getRiskIcon = (level: string) => {
        switch (level) {
            case 'Critical': return '🔴';
            case 'High': return '🟠';
            case 'Moderate': return '🟡';
            case 'Low': return '🟢';
            default: return '⚪';
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
                <p className="text-sm text-slate-500 animate-pulse">AI is analyzing your startup data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/25">🧠</div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">AI Intelligence Center</h1>
                        <p className="text-sm text-slate-400">AI-powered risk prediction & competitive benchmarking</p>
                    </div>
                    {(risk?.isAIPowered || bench?.isAIPowered) && (
                        <span className="ml-auto px-3 py-1.5 bg-purple-500/15 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-300 animate-pulse">
                            ⚡ AI-POWERED
                        </span>
                    )}
                    {risk && !risk.isAIPowered && (
                        <span className="ml-auto px-3 py-1.5 bg-slate-800/60 border border-slate-700/30 rounded-lg text-xs text-slate-400">
                            📊 Rule-based (AI rate limited)
                        </span>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-sm text-red-400">{error}</div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setActiveTab('risk')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'risk' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/25' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/40'}`}>
                        🎯 Risk Prediction
                    </button>
                    <button onClick={() => setActiveTab('benchmark')}
                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'benchmark' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800/40'}`}>
                        📊 AI Benchmarking
                    </button>
                    <button onClick={loadData} className="ml-auto px-4 py-2 bg-slate-900/60 border border-slate-800/40 text-slate-400 hover:text-white rounded-lg text-sm transition-all">
                        🔄 Re-analyze
                    </button>
                </div>

                {/* ─── RISK TAB ─────────────────────────────────────────── */}
                {activeTab === 'risk' && risk && (
                    <div className="space-y-6">
                        {/* Risk Score Header */}
                        <div className={`bg-gradient-to-r ${getRiskGradient(risk.riskScore)} rounded-2xl p-6 shadow-xl`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium mb-1">AI Risk Score</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-5xl font-black text-white">{risk.riskScore}</span>
                                        <span className="text-white/60 text-lg">/100</span>
                                    </div>
                                    <p className="text-white/80 mt-1">{risk.overallRiskLevel} Risk</p>
                                </div>
                                <div className="text-6xl">{getRiskIcon(risk.overallRiskLevel)}</div>
                            </div>
                            <div className="mt-4 h-3 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white/30 rounded-full transition-all duration-1000" style={{ width: `${risk.riskScore}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-white/50 mt-1">
                                <span>Low Risk</span><span>Moderate</span><span>High</span><span>Critical</span>
                            </div>
                        </div>

                        {/* Trend Analysis */}
                        {risk.trendAnalysis && (
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">📈 Trend Analysis</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">{risk.trendAnalysis}</p>
                            </div>
                        )}

                        {/* AI Hidden Insights */}
                        {risk.aiInsights && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3">🔮 AI Hidden Risk Detection</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">{risk.aiInsights}</p>
                            </div>
                        )}

                        {/* Predictions Grid */}
                        {risk.predictions?.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">⚡ Risk Predictions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {risk.predictions.map((pred: any, i: number) => (
                                        <div key={i} className={`rounded-xl p-4 border ${PROB_BG[pred.probability] || 'bg-slate-800/30 border-slate-700/30'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/20 rounded">
                                                    {pred.category}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase">
                                                    {pred.probability} prob.
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-white mb-2">{pred.prediction}</p>
                                            <div className="flex items-center justify-between text-[11px] opacity-70">
                                                <span>⏱ {pred.timeframe}</span>
                                                <span>💥 {pred.impact}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Items */}
                        {risk.actionItems?.length > 0 && (
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">✅ AI Recommended Actions</h3>
                                <div className="space-y-3">
                                    {risk.actionItems.map((action: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                                            <span className="w-6 h-6 flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">{i + 1}</span>
                                            <p className="text-sm text-slate-300">{action}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── BENCHMARK TAB ────────────────────────────────────── */}
                {activeTab === 'benchmark' && bench && (
                    <div className="space-y-6">
                        {/* Overall Position */}
                        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/70 text-sm font-medium mb-1">Competitive Position</p>
                                    <span className="text-4xl font-black text-white">{bench.overallPosition}</span>
                                    <p className="text-white/60 text-sm mt-2">{bench.peerComparison}</p>
                                </div>
                                <div className="text-6xl">🏆</div>
                            </div>
                        </div>

                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Strengths */}
                            <div className="bg-slate-900/60 border border-green-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider mb-4">💪 Strength Areas</h3>
                                {bench.strengthAreas?.length > 0 ? (
                                    <div className="space-y-3">
                                        {bench.strengthAreas.map((s: any, i: number) => (
                                            <div key={i} className="p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-white">{s.metric}</span>
                                                    <span className="text-xs font-bold text-green-400 bg-green-500/15 px-2 py-0.5 rounded">{s.vsAvg}</span>
                                                </div>
                                                <p className="text-xs text-slate-400">{s.insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No standout strengths detected vs peers.</p>
                                )}
                            </div>

                            {/* Weaknesses */}
                            <div className="bg-slate-900/60 border border-red-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">⚠️ Areas to Improve</h3>
                                {bench.weaknessAreas?.length > 0 ? (
                                    <div className="space-y-3">
                                        {bench.weaknessAreas.map((w: any, i: number) => (
                                            <div key={i} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-semibold text-white">{w.metric}</span>
                                                    <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2 py-0.5 rounded">{w.vsAvg}</span>
                                                </div>
                                                <p className="text-xs text-slate-400">{w.insight}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500">No critical weaknesses detected. Great performance!</p>
                                )}
                            </div>
                        </div>

                        {/* Competitive Edge */}
                        {bench.competitiveEdge && (
                            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-3">🌟 Competitive Edge</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">{bench.competitiveEdge}</p>
                            </div>
                        )}

                        {/* AI Hidden Opportunities */}
                        {bench.aiInsights && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3">🔮 AI-Detected Opportunities</h3>
                                <p className="text-sm text-slate-300 leading-relaxed">{bench.aiInsights}</p>
                            </div>
                        )}

                        {/* Recommendations */}
                        {bench.recommendations?.length > 0 && (
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">🚀 AI Recommendations</h3>
                                <div className="space-y-3">
                                    {bench.recommendations.map((rec: string, i: number) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg">
                                            <span className="w-6 h-6 flex-shrink-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white">{i + 1}</span>
                                            <p className="text-sm text-slate-300">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {!risk && !bench && (
                    <div className="text-center py-20">
                        <p className="text-slate-500">No data available. Submit metrics to enable AI analysis.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIRiskDashboard;
