import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<'founder' | 'investor'>('founder');
    const [companyName, setCompanyName] = useState('');
    const [sector, setSector] = useState('Fintech');
    const [stage, setStage] = useState('Seed');
    const [city, setCity] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register, user } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'investor') navigate('/investor');
            else navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register({
                    email, password, name, role,
                    ...(role === 'founder' ? { companyName, sector, stage, city, foundedDate: new Date().toISOString() } : {})
                });
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white text-sm placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 outline-none transition-all";

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Background decoration */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-center pt-12 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30">
                        VP
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            VenturePulse
                        </h1>
                        <p className="text-xs text-slate-500 tracking-widest uppercase">Startup Progress Monitor</p>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-8">
                <div className="text-center mb-8 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
                        Monitor, Analyze &<br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Predict Growth
                        </span>
                    </h2>
                    <p className="text-slate-400 text-lg">
                        AI-powered scoring, predictive risk analysis, and real-time dashboards for startups, investors, and admins.
                    </p>
                </div>

                {/* Auth Card */}
                <div className="w-full max-w-md">
                    <div className="bg-slate-900/70 backdrop-blur-xl border border-indigo-500/10 rounded-2xl p-8 shadow-2xl shadow-indigo-500/5">
                        <h3 className="text-xl font-bold text-white mb-1">
                            {isRegister ? 'Create Account' : 'Welcome Back'}
                        </h3>
                        <p className="text-sm text-slate-400 mb-6">
                            {isRegister ? 'Join VenturePulse to get started' : 'Sign in to your dashboard'}
                        </p>

                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                    placeholder="you@company.com" className={inputClass} />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                    placeholder="••••••••" className={inputClass} />
                            </div>

                            {isRegister && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                                            placeholder="Your full name" className={inputClass} />
                                    </div>

                                    {/* Role Selection */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">I am a</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'founder' as const, label: 'Startup Founder', icon: '🚀', desc: 'Track & grow' },
                                                { value: 'investor' as const, label: 'Investor', icon: '💼', desc: 'Discover & compare' },
                                            ].map(r => (
                                                <button
                                                    key={r.value} type="button"
                                                    onClick={() => setRole(r.value)}
                                                    className={`p-3 rounded-xl border text-left transition-all ${role === r.value
                                                        ? 'border-indigo-500/50 bg-indigo-500/10 ring-1 ring-indigo-500/30'
                                                        : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <span className="text-lg">{r.icon}</span>
                                                    <p className="text-sm text-white font-semibold mt-1">{r.label}</p>
                                                    <p className="text-[10px] text-slate-500">{r.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {role === 'founder' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Company Name</label>
                                                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required
                                                    placeholder="Your Startup Name" className={inputClass} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Industry</label>
                                                    <select value={sector} onChange={e => setSector(e.target.value)} className={inputClass}>
                                                        {['Fintech', 'Healthtech', 'Edtech', 'Ecommerce', 'DeepTech', 'Agritech', 'Logistics', 'CleanTech', 'SaaS', 'Other'].map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Stage</label>
                                                    <select value={stage} onChange={e => setStage(e.target.value)} className={inputClass}>
                                                        {['Idea', 'Seed', 'Series A', 'Growth'].map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">City</label>
                                                <input type="text" value={city} onChange={e => setCity(e.target.value)} required
                                                    placeholder="e.g., Bengaluru" className={inputClass} />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-500 hover:to-violet-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                            >
                                {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                            </button>
                        </div>

                        {!isRegister && (
                            <div className="mt-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                <p className="text-xs text-slate-500 text-center">
                                    Founder: <span className="text-slate-400">founder1@nspms.in</span> / <span className="text-slate-400">password123</span>
                                    <br />
                                    Investor: <span className="text-slate-400">investor@nspms.in</span> / <span className="text-slate-400">password123</span>
                                    <br />
                                    Admin: <span className="text-slate-400">admin@nspms.in</span> / <span className="text-slate-400">password123</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="relative z-10 text-center py-6 text-xs text-slate-600">
                VenturePulse — Startup Progress Monitor © 2025
            </footer>
        </div>
    );
};

export default Login;
