import React, { useEffect, useState } from 'react';
import api from '../api/client';
import Navbar from '../components/Navbar';

const PLAN_ICONS: Record<string, string> = { free: '🆓', pro: '⚡', enterprise: '🏢' };
const PLAN_COLORS: Record<string, string> = {
    free: 'from-slate-600 to-slate-700',
    pro: 'from-violet-600 to-indigo-600',
    enterprise: 'from-amber-500 to-orange-600'
};

const Plans: React.FC = () => {
    const [currentPlan, setCurrentPlan] = useState('free');
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState('');

    useEffect(() => {
        Promise.all([
            api.get('/subscription'),
            api.get('/subscription/plans')
        ]).then(([subRes, plansRes]) => {
            setCurrentPlan(subRes.data.plan);
            setPlans(plansRes.data.plans);
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const switchPlan = async (planId: string) => {
        setUpgrading(planId);
        try {
            const res = await api.put('/subscription/upgrade', { plan: planId });
            setCurrentPlan(res.data.subscription.plan);
        } catch (err) {
            console.error(err);
        } finally {
            setUpgrading('');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950"><Navbar />
            <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" /></div>
        </div>
    );

    const featureLabels: Record<string, string> = {
        dashboard_basic: '📊 Basic Dashboard',
        metrics_submit: '📝 Submit Metrics',
        milestones: '🎯 Milestone Tracking',
        alerts_basic: '🔔 Basic Alerts',
        health_score: '💪 Health Score Engine',
        alerts_full: '🚨 Smart Alert System',
        forecasting: '📈 Revenue Forecasting',
        ai_advisor: '🤖 AI Advisor',
        score_history: '📉 Score History',
        report_export: '📄 Report Export (PDF/CSV)',
        investor_mode: '🏦 Investor Dashboard',
        benchmarking: '📊 Industry Benchmarks',
        scenario_simulation: '🔬 Scenario Simulation',
        custom_kpi: '📐 Custom KPI Builder',
        audit_logs: '🔒 Audit Logs',
        team_management: '👥 Team Management',
    };

    return (
        <div className="min-h-screen bg-slate-950">
            <Navbar />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white">Choose Your Plan</h1>
                    <p className="text-sm text-slate-400 mt-2">Scale your startup intelligence with the right plan</p>
                    <p className="text-xs text-slate-600 mt-1">No payment required — switch plans instantly</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan: any) => {
                        const isCurrent = plan.id === currentPlan;
                        return (
                            <div key={plan.id} className={`relative bg-slate-900/60 border rounded-2xl p-6 transition-all ${isCurrent ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-slate-800/40 hover:border-slate-700/60'}`}>
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <span className="px-3 py-1 bg-violet-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full">Current Plan</span>
                                    </div>
                                )}
                                <div className="text-center mb-5">
                                    <span className="text-4xl">{PLAN_ICONS[plan.id]}</span>
                                    <h3 className="text-xl font-bold text-white mt-2">{plan.name}</h3>
                                    <p className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mt-1">{plan.price}</p>
                                    <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                                </div>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((f: string, i: number) => (
                                        <li key={i} className="text-sm text-slate-300 flex items-center gap-2">
                                            <span className="text-green-400 text-xs">✓</span>
                                            {featureLabels[f] || f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => switchPlan(plan.id)}
                                    disabled={isCurrent || upgrading === plan.id}
                                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${isCurrent
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : `bg-gradient-to-r ${PLAN_COLORS[plan.id]} text-white hover:opacity-90 shadow-lg`
                                        } disabled:opacity-50`}
                                >
                                    {upgrading === plan.id ? 'Switching...' : isCurrent ? 'Active' : `Switch to ${plan.name}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Plans;
