import React, { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
    CartesianGrid, BarChart, Bar
} from 'recharts';
import api from '../api/client';
import Navbar from '../components/Navbar';

type ScenarioType = 'hire' | 'marketing' | 'funding' | 'expansion' | 'custom';

const SCENARIOS: { type: ScenarioType; emoji: string; title: string; description: string; color: string; border: string }[] = [
    { type: 'hire',      emoji: '👥', title: 'Hire Employees',       description: 'Model cost & revenue impact of growing your team',       color: 'from-violet-500 to-purple-600',  border: 'border-violet-500/30' },
    { type: 'marketing', emoji: '📢', title: 'Marketing Campaign',    description: 'Estimate ROI of increasing your marketing budget',       color: 'from-cyan-500 to-blue-600',      border: 'border-cyan-500/30' },
    { type: 'funding',   emoji: '💰', title: 'Raise Funding',         description: 'See how new investment extends runway & changes risk',   color: 'from-emerald-500 to-green-600',  border: 'border-emerald-500/30' },
    { type: 'expansion', emoji: '🗺️', title: 'Expand to New Markets', description: 'Project costs and returns of geographic expansion',      color: 'from-amber-500 to-orange-600',   border: 'border-amber-500/30' },
    { type: 'custom',    emoji: '🔬', title: 'Custom Scenario',       description: 'Fine-tune revenue, expenses & funding manually',         color: 'from-rose-500 to-pink-600',      border: 'border-rose-500/30' },
];

const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${Math.round(n).toLocaleString('en-IN')}`;
const inputCls = 'w-full px-3 py-2 bg-slate-800/70 border border-slate-700/50 rounded-lg text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none';
const labelCls = 'block text-xs text-slate-400 uppercase tracking-wider mb-1';

const RiskBadge: React.FC<{ level: string }> = ({ level }) => {
    const cls = level === 'Low' ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : level === 'Moderate' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : level === 'High' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
              : 'bg-red-500/15 text-red-400 border-red-500/30';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>{level}</span>;
};

const Simulation: React.FC = () => {
    const [activeScenario, setActiveScenario] = useState<ScenarioType>('hire');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Hire
    const [numEmployees, setNumEmployees] = useState(5);
    const [avgSalary, setAvgSalary] = useState(60000);
    // Marketing
    const [marketingBudget, setMarketingBudget] = useState(200000);
    const [userGrowth, setUserGrowth] = useState(20);
    // Funding
    const [fundingAmount, setFundingAmount] = useState(5000000);
    // Expansion
    const [numCities, setNumCities] = useState(3);
    const [setupCost, setSetupCost] = useState(500000);
    const [cityRevenue, setCityRevenue] = useState(200000);
    // Custom
    const [revChange, setRevChange] = useState(0);
    const [expChange, setExpChange] = useState(0);
    const [addFunding, setAddFunding] = useState(0);
    const [churnChange, setChurnChange] = useState(0);

    const buildPayload = () => {
        const base = { scenarioType: activeScenario };
        if (activeScenario === 'hire')      return { ...base, numEmployees, avgMonthlySalary: avgSalary };
        if (activeScenario === 'marketing') return { ...base, extraMarketingBudget: marketingBudget, expectedUserGrowthPercent: userGrowth };
        if (activeScenario === 'funding')   return { ...base, fundingAmount };
        if (activeScenario === 'expansion') return { ...base, numCities, setupCostPerCity: setupCost, revenuePerCityPerMonth: cityRevenue };
        return { ...base, revenueChangePercent: revChange, expenseChangePercent: expChange, additionalFunding: addFunding, churnChangePercent: churnChange };
    };

    const simulate = async () => {
        setLoading(true); setError(''); setResult(null);
        try {
            const res = await api.post('/simulation', buildPayload());
            setResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally { setLoading(false); }
    };

    const active = SCENARIOS.find(s => s.type === activeScenario)!;

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">🔬 Decision Simulator</h1>
                    <p className="text-sm text-slate-400 mt-1">Test business decisions before you make them — see the 12-month impact on runway, growth, profitability & risk</p>
                </div>

                {/* Scenario Selector */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                    {SCENARIOS.map(s => (
                        <button key={s.type} onClick={() => { setActiveScenario(s.type); setResult(null); }}
                            className={`p-4 rounded-xl border text-left transition-all ${activeScenario === s.type
                                ? `bg-gradient-to-br ${s.color} border-transparent shadow-lg`
                                : `bg-slate-900/60 ${s.border} hover:border-slate-600`}`}>
                            <div className="text-2xl mb-1">{s.emoji}</div>
                            <div className="text-xs font-bold text-white">{s.title}</div>
                            <div className="text-xs text-slate-300 mt-0.5 opacity-80 leading-tight">{s.description}</div>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Configuration */}
                    <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-6">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${active.color} rounded-lg text-white text-sm font-semibold mb-4`}>
                            <span>{active.emoji}</span> {active.title}
                        </div>
                        <p className="text-xs text-slate-400 mb-5">{active.description}</p>

                        <div className="space-y-4">
                            {activeScenario === 'hire' && (<>
                                <div>
                                    <label className={labelCls}>Number of Employees</label>
                                    <input type="number" min={1} max={100} value={numEmployees} onChange={e => setNumEmployees(Number(e.target.value))} className={inputCls} />
                                    <p className="text-xs text-slate-500 mt-1">Including support, engineering, sales</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Avg Monthly Salary (₹)</label>
                                    <input type="number" min={20000} step={5000} value={avgSalary} onChange={e => setAvgSalary(Number(e.target.value))} className={inputCls} />
                                    <p className="text-xs text-slate-500 mt-1">+25% overhead (PF, insurance, equipment) auto-added</p>
                                </div>
                                <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                                    <p className="text-xs text-violet-300 font-semibold">Monthly Cost Impact</p>
                                    <p className="text-lg font-bold text-white mt-0.5">{fmt(numEmployees * avgSalary * 1.25)}<span className="text-xs text-slate-400">/month</span></p>
                                    <p className="text-xs text-slate-400 mt-0.5">Revenue ramp-up modeled over 3 months</p>
                                </div>
                            </>)}

                            {activeScenario === 'marketing' && (<>
                                <div>
                                    <label className={labelCls}>Extra Marketing Budget (₹/month)</label>
                                    <input type="number" min={10000} step={50000} value={marketingBudget} onChange={e => setMarketingBudget(Number(e.target.value))} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Expected User Growth (%/month)</label>
                                    <div className="flex items-center gap-3">
                                        <input type="range" min={1} max={100} value={userGrowth} onChange={e => setUserGrowth(Number(e.target.value))} className="flex-1 accent-cyan-500" />
                                        <span className="text-cyan-400 font-bold text-sm w-12 text-right">+{userGrowth}%</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                    <p className="text-xs text-cyan-300 font-semibold">Monthly Spend</p>
                                    <p className="text-lg font-bold text-white mt-0.5">{fmt(marketingBudget)}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Revenue impact begins month 3 (typical CAC lag)</p>
                                </div>
                            </>)}

                            {activeScenario === 'funding' && (<>
                                <div>
                                    <label className={labelCls}>Funding Amount (₹)</label>
                                    <input type="number" min={500000} step={500000} value={fundingAmount} onChange={e => setFundingAmount(Number(e.target.value))} className={inputCls} />
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg space-y-1">
                                    <p className="text-xs text-emerald-300 font-semibold">Raise Summary</p>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Gross Raise</span><span className="text-white font-bold">{fmt(fundingAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Deal Costs (~1.5%)</span><span className="text-red-400">{fmt(fundingAmount * 0.015)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-t border-emerald-500/20 pt-1">
                                        <span className="text-slate-300">Net to Bank</span><span className="text-emerald-400 font-bold">{fmt(fundingAmount * 0.985)}</span>
                                    </div>
                                </div>
                            </>)}

                            {activeScenario === 'expansion' && (<>
                                <div>
                                    <label className={labelCls}>Number of New Cities</label>
                                    <input type="number" min={1} max={20} value={numCities} onChange={e => setNumCities(Number(e.target.value))} className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>Setup Cost per City (₹)</label>
                                    <input type="number" min={100000} step={100000} value={setupCost} onChange={e => setSetupCost(Number(e.target.value))} className={inputCls} />
                                    <p className="text-xs text-slate-500 mt-1">Office, staff, legal, ops setup</p>
                                </div>
                                <div>
                                    <label className={labelCls}>Expected Revenue per City (₹/month)</label>
                                    <input type="number" min={50000} step={50000} value={cityRevenue} onChange={e => setCityRevenue(Number(e.target.value))} className={inputCls} />
                                </div>
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                                    <div className="flex justify-between text-xs"><span className="text-slate-400">Total Setup Cost</span><span className="text-red-400 font-bold">{fmt(numCities * setupCost)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-400">Monthly Ops Added</span><span className="text-amber-400 font-bold">+{fmt(numCities * 150000)}</span></div>
                                    <div className="flex justify-between text-xs"><span className="text-slate-400">Revenue (from month 3)</span><span className="text-green-400 font-bold">+{fmt(numCities * cityRevenue)}</span></div>
                                </div>
                            </>)}

                            {activeScenario === 'custom' && (<>
                                <div>
                                    <label className={labelCls}>Revenue Change: {revChange > 0 ? '+' : ''}{revChange}%</label>
                                    <input type="range" min={-50} max={100} value={revChange} onChange={e => setRevChange(Number(e.target.value))} className={`w-full accent-green-500`} />
                                </div>
                                <div>
                                    <label className={labelCls}>Expense Reduction: -{expChange}%</label>
                                    <input type="range" min={0} max={50} value={expChange} onChange={e => setExpChange(Number(e.target.value))} className="w-full accent-emerald-500" />
                                </div>
                                <div>
                                    <label className={labelCls}>Additional Funding (₹)</label>
                                    <input type="number" value={addFunding} onChange={e => setAddFunding(Number(e.target.value))} className={inputCls} placeholder="e.g. 2000000" />
                                </div>
                                <div>
                                    <label className={labelCls}>Churn Improvement: -{churnChange}%</label>
                                    <input type="range" min={0} max={80} value={churnChange} onChange={e => setChurnChange(Number(e.target.value))} className="w-full accent-violet-500" />
                                </div>
                            </>)}

                            {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">{error}</div>}

                            <button onClick={simulate} disabled={loading}
                                className={`w-full py-3 bg-gradient-to-r ${active.color} text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2`}>
                                {loading
                                    ? <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" /> Simulating…</>
                                    : <>{active.emoji} Run Simulation</>}
                            </button>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="lg:col-span-2 space-y-6">
                        {!result && !loading && (
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                                <div className="text-5xl mb-4">🧪</div>
                                <h3 className="text-white font-semibold mb-2">Configure & Run</h3>
                                <p className="text-sm text-slate-500 max-w-sm">Select a scenario, enter the parameters on the left, then click Run Simulation to see a full 12-month impact analysis.</p>
                            </div>
                        )}

                        {result && (<>
                            {/* Summary Banner */}
                            <div className={`bg-gradient-to-r ${active.color} rounded-xl p-4 text-white`}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-lg">{result.scenario}</span>
                                    <div className="flex gap-2 items-center">
                                        {result.breakEvenMonth && <span className="text-xs bg-white/20 px-2 py-1 rounded-lg">Break-even: Month {result.breakEvenMonth}</span>}
                                        <span className={`text-xs px-2 py-1 rounded-lg font-bold ${result.riskDelta > 0 ? 'bg-green-400/30' : result.riskDelta < 0 ? 'bg-red-400/30' : 'bg-white/20'}`}>
                                            Risk {result.riskDelta > 0 ? `↓ ${result.riskDelta}pts` : result.riskDelta < 0 ? `↑ ${Math.abs(result.riskDelta)}pts` : 'unchanged'}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm opacity-80">{result.summary}</p>
                            </div>

                            {/* Impact Cards */}
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { label: 'Revenue/mo', cur: result.current.revenue, sim: result.simulated.revenue, fmt: true },
                                    { label: 'Burn Rate', cur: result.current.burnRate, sim: result.simulated.burnRate, fmt: true, lowerBetter: true },
                                    { label: 'Runway', cur: result.current.runway, sim: result.simulated.runway, unit: ' mo', fmt: false },
                                    { label: 'Users', cur: result.current.users, sim: result.simulated.users, fmt: false },
                                ].map(k => {
                                    const better = k.lowerBetter ? k.sim <= k.cur : k.sim >= k.cur;
                                    const delta = k.sim - k.cur;
                                    return (
                                        <div key={k.label} className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-3">
                                            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                                            <p className="text-slate-400 text-xs">{k.fmt ? fmt(k.cur) : k.cur === 999 ? '∞' : k.cur.toLocaleString()}{k.unit || ''}</p>
                                            <p className="text-white font-bold text-sm mt-0.5">{k.fmt ? fmt(k.sim) : k.sim === 999 ? '∞' : k.sim.toLocaleString()}{k.unit || ''}</p>
                                            <p className={`text-xs font-semibold mt-1 ${better ? 'text-green-400' : 'text-red-400'}`}>
                                                {delta >= 0 ? '+' : ''}{k.fmt ? fmt(delta) : delta.toLocaleString()}{k.unit || ''}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 12-Month Line Chart — Revenue vs Expenses */}
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-white mb-1">12-Month Revenue vs Expenses</h3>
                                <p className="text-xs text-slate-500 mb-4">Month-by-month financials after the decision</p>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={result.monthlyProjection} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `M${v}`} />
                                        <YAxis
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)}
                                            domain={['auto', 'auto']}
                                            width={56}
                                        />
                                        <Tooltip formatter={(v: any, name?: string) => [fmt(Number(v ?? 0)), name ?? '']} contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }} labelFormatter={l => `Month ${l}`} />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f87171" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                                        <Line type="monotone" dataKey="burnRate" name="Burn Rate" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Monthly Profit / Loss bars */}
                            <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-5">
                                <h3 className="text-sm font-semibold text-white mb-1">Monthly Profit / Loss</h3>
                                <p className="text-xs text-slate-500 mb-4">Green = profitable month&nbsp;&nbsp;·&nbsp;&nbsp;Red = loss month</p>
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart
                                        data={result.monthlyProjection.map((m: any) => ({
                                            month: m.month,
                                            profit: m.profit >= 0 ? m.profit : 0,
                                            loss: m.profit < 0 ? m.profit : 0,
                                            label: m.profit,
                                        }))}
                                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                                        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `M${v}`} />
                                        <YAxis
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            tickFormatter={v => v >= 100000 ? `${(v/100000).toFixed(1)}L` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.abs(v))}
                                            domain={['auto', 'auto']}
                                            width={56}
                                        />
                                        <Tooltip
                                            formatter={(v: any, name?: string) => [fmt(Math.abs(Number(v ?? 0))), name === 'profit' ? 'Profit' : 'Loss']}
                                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                                            labelFormatter={l => `Month ${l}`}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11 }} />
                                        <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[3, 3, 0, 0]} />
                                        <Bar dataKey="loss" name="Loss" fill="#f87171" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Comparison Table + Insights side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Comparison Table */}
                                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-800/40">
                                        <h3 className="text-sm font-semibold text-white">Before vs After (Month 12)</h3>
                                    </div>
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-xs text-slate-500 uppercase">
                                                <th className="text-left px-4 py-2">Metric</th>
                                                <th className="text-right px-2 py-2">Now</th>
                                                <th className="text-right px-2 py-2">Simulated</th>
                                                <th className="text-right px-4 py-2">Δ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.comparison.map((row: any, i: number) => (
                                                <tr key={i} className="border-t border-slate-800/30">
                                                    <td className="px-4 py-2 text-xs text-white">{row.metric}</td>
                                                    <td className="px-2 py-2 text-xs text-slate-400 text-right">{row.current}</td>
                                                    <td className="px-2 py-2 text-xs text-white text-right font-semibold">{row.simulated}</td>
                                                    <td className={`px-4 py-2 text-xs text-right font-bold ${row.better ? 'text-green-400' : 'text-red-400'}`}>{row.change}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Insights */}
                                <div className="bg-slate-900/60 border border-slate-800/40 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-white">Key Insights</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">Risk:</span>
                                            <RiskBadge level={result.current.riskLevel} />
                                            <span className="text-slate-600 text-xs">→</span>
                                            <RiskBadge level={result.simulated.riskLevel} />
                                        </div>
                                    </div>
                                    <ul className="space-y-2">
                                        {result.insights.map((ins: string, i: number) => (
                                            <li key={i} className="text-xs text-slate-300 leading-relaxed">{ins}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulation;
