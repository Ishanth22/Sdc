import React, { useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

const Reports: React.FC = () => {
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateReport = async () => {
        setLoading(true); setError('');
        try {
            const res = await api.get('/reports/summary');
            setReport(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = async () => {
        try {
            const res = await api.get('/reports/csv', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'metrics_export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        }
    };

    const printReport = () => {
        window.print();
    };

    const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`;

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25">📄</div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Reports</h1>
                            <p className="text-sm text-slate-400">Generate investor-ready reports and data exports</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                        <p className="text-red-400 text-sm">{error}</p>
                        {error.includes('plan') && <p className="text-xs text-slate-500 mt-1">Upgrade to Pro for report generation.</p>}
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <button onClick={generateReport} disabled={loading} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5 hover:border-indigo-500/30 transition-all text-left group">
                        <span className="text-2xl">📊</span>
                        <h3 className="text-sm font-semibold text-white mt-2 group-hover:text-indigo-300 transition-colors">Performance Summary</h3>
                        <p className="text-xs text-slate-500 mt-1">Generate a comprehensive report with all metrics</p>
                    </button>
                    <button onClick={downloadCSV} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5 hover:border-green-500/30 transition-all text-left group">
                        <span className="text-2xl">📥</span>
                        <h3 className="text-sm font-semibold text-white mt-2 group-hover:text-green-300 transition-colors">Export to CSV</h3>
                        <p className="text-xs text-slate-500 mt-1">Download metrics data as Excel-compatible CSV</p>
                    </button>
                    <button onClick={() => { generateReport().then(() => setTimeout(printReport, 500)); }} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5 hover:border-violet-500/30 transition-all text-left group">
                        <span className="text-2xl">🖨️</span>
                        <h3 className="text-sm font-semibold text-white mt-2 group-hover:text-violet-300 transition-colors">Print / PDF</h3>
                        <p className="text-xs text-slate-500 mt-1">Print or save as PDF for investors</p>
                    </button>
                </div>

                {/* Report Preview */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500" />
                    </div>
                )}

                {report && (
                    <div id="report-content" className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-8 print:bg-white print:text-black print:border-none">
                        {/* Report Header */}
                        <div className="border-b border-slate-700/50 pb-4 mb-6 print:border-black/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-white print:text-black">📊 {report.company.name} – Performance Report</h2>
                                    <p className="text-sm text-slate-400 print:text-gray-500">{report.company.sector} | {report.company.stage} | {report.company.city}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 print:text-gray-400">Generated: {new Date(report.generatedAt).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500 print:text-gray-400">Team: {report.company.teamSize} members</p>
                                </div>
                            </div>
                        </div>

                        {/* Health Score */}
                        {report.healthScore && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-400 print:text-gray-600 uppercase tracking-wider mb-3">Health Score</h3>
                                <div className="flex items-center gap-4">
                                    <div className={`text-4xl font-bold ${report.healthScore.score >= 70 ? 'text-green-400' : report.healthScore.score >= 40 ? 'text-amber-400' : 'text-red-400'} print:!text-black`}>
                                        {report.healthScore.score}/100
                                    </div>
                                    <div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${report.healthScore.riskLevel === 'Low' ? 'bg-green-500/20 text-green-400' : report.healthScore.riskLevel === 'Moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'} print:bg-transparent print:!text-black`}>
                                            Risk: {report.healthScore.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Current Metrics */}
                        {report.currentMetrics && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-400 print:text-gray-600 uppercase tracking-wider mb-3">Latest Metrics ({report.currentMetrics.period})</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Revenue', value: fmt(report.currentMetrics.revenue) },
                                        { label: 'Burn Rate', value: fmt(report.currentMetrics.burnRate) },
                                        { label: 'Runway', value: `${report.currentMetrics.runwayMonths} months` },
                                        { label: 'Active Users', value: report.currentMetrics.activeUsers.toLocaleString() },
                                        { label: 'Churn Rate', value: `${report.currentMetrics.churnRate}%` },
                                        { label: 'CAC', value: fmt(report.currentMetrics.cac) },
                                        { label: 'LTV', value: fmt(report.currentMetrics.ltv) },
                                        { label: 'LTV/CAC', value: `${report.currentMetrics.ltvCacRatio}x` },
                                    ].map((item, i) => (
                                        <div key={i} className="bg-slate-800/40 print:bg-gray-100 rounded-lg p-3">
                                            <p className="text-[10px] text-slate-500 print:text-gray-500 uppercase">{item.label}</p>
                                            <p className="text-sm font-bold text-white print:text-black">{item.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Metrics History Table */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-slate-400 print:text-gray-600 uppercase tracking-wider mb-3">Historical Metrics ({report.summary.totalMetricsMonths} months)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-slate-500 print:text-gray-500 uppercase">
                                            <th className="text-left px-3 py-2">Period</th>
                                            <th className="text-right px-3 py-2">Revenue</th>
                                            <th className="text-right px-3 py-2">Burn</th>
                                            <th className="text-right px-3 py-2">Runway</th>
                                            <th className="text-right px-3 py-2">Users</th>
                                            <th className="text-right px-3 py-2">Churn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.metricsHistory.map((m: any, i: number) => (
                                            <tr key={i} className="border-t border-slate-800/30 print:border-gray-200">
                                                <td className="px-3 py-2 text-white print:text-black font-mono">{m.period}</td>
                                                <td className="px-3 py-2 text-right text-slate-300 print:text-gray-700">{fmt(m.revenue)}</td>
                                                <td className="px-3 py-2 text-right text-slate-300 print:text-gray-700">{fmt(m.burnRate)}</td>
                                                <td className="px-3 py-2 text-right text-slate-300 print:text-gray-700">{m.runway}mo</td>
                                                <td className="px-3 py-2 text-right text-slate-300 print:text-gray-700">{m.users.toLocaleString()}</td>
                                                <td className="px-3 py-2 text-right text-slate-300 print:text-gray-700">{m.churn}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Milestones */}
                        {report.milestones.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-semibold text-slate-400 print:text-gray-600 uppercase tracking-wider mb-3">
                                    Milestones ({report.summary.milestonesCompleted}/{report.summary.milestonesTotal} completed)
                                </h3>
                                <div className="space-y-2">
                                    {report.milestones.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between bg-slate-800/30 print:bg-gray-50 rounded-lg px-4 py-2">
                                            <span className="text-sm text-white print:text-black">{m.completed ? '✅' : '⏳'} {m.title}</span>
                                            <span className="text-xs text-slate-500">{m.completion}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Active Alerts */}
                        {report.activeAlerts.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-400 print:text-gray-600 uppercase tracking-wider mb-3">Active Alerts ({report.activeAlerts.length})</h3>
                                <div className="space-y-2">
                                    {report.activeAlerts.map((a: any, i: number) => (
                                        <div key={i} className={`rounded-lg px-4 py-2 text-sm ${a.severity === 'critical' ? 'bg-red-500/10 text-red-300' : a.severity === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-blue-500/10 text-blue-300'} print:bg-transparent print:!text-black`}>
                                            [{a.severity.toUpperCase()}] {a.title}: {a.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
