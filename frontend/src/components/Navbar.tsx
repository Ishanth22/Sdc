import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path: string) => location.pathname === path;

    const founderLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/metrics/new', label: 'Submit Metrics', icon: '📝' },
        { path: '/milestones', label: 'Milestones', icon: '🎯' },
        { path: '/advisor', label: 'AI Advisor', icon: '🤖' },
        { path: '/forecasting', label: 'Forecasting', icon: '📈' },
        { path: '/ai-risk', label: 'AI Risk', icon: '🧠' },
    ];

    const founderMore = [
        { path: '/simulation', label: 'Simulation', icon: '🔬' },
        { path: '/custom-kpis', label: 'Custom KPIs', icon: '📐' },
        { path: '/reports', label: 'Reports', icon: '📄' },
        { path: '/history', label: 'History', icon: '📉' },
        { path: '/plans', label: 'Plans', icon: '💎' },
        { path: '/alert-settings', label: 'Alerts', icon: '🚨' },
        { path: '/profile', label: 'Profile', icon: '⚙️' },
    ];

    const investorLinks = [
        { path: '/investor', label: 'Discover', icon: '💼' },
    ];

    const adminLinks = [
        { path: '/admin', label: 'Admin Dashboard', icon: '🏛️' },
    ];

    const links = user?.role === 'admin' ? adminLinks : user?.role === 'investor' ? investorLinks : founderLinks;

    return (
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-indigo-500/10 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to={user?.role === 'admin' ? '/admin' : user?.role === 'investor' ? '/investor' : '/dashboard'} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/25">
                            VP
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                                VenturePulse
                            </span>
                            <p className="text-[9px] text-slate-600 -mt-0.5 tracking-widest uppercase">Startup Monitor</p>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {links.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                            >
                                <span className="mr-1">{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                        {/* More Dropdown (founder only) */}
                        {user?.role === 'founder' && (
                            <div className="relative" ref={moreRef}>
                                <button
                                    onClick={() => setMoreOpen(!moreOpen)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${moreOpen || founderMore.some(l => isActive(l.path))
                                        ? 'bg-indigo-500/15 text-indigo-300'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                >
                                    ⋯ More
                                </button>
                                {moreOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700/60 rounded-xl shadow-xl shadow-black/40 py-1 z-50 animate-fade-in">
                                        {founderMore.map(link => (
                                            <Link
                                                key={link.path}
                                                to={link.path}
                                                onClick={() => setMoreOpen(false)}
                                                className={`block px-4 py-2.5 text-sm transition-all ${isActive(link.path)
                                                    ? 'text-indigo-300 bg-indigo-500/10'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                    }`}
                                            >
                                                {link.icon} {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500/30 to-violet-500/30 rounded-full flex items-center justify-center text-xs text-indigo-300 font-semibold">
                                {(user?.email || '?')[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs text-slate-300 font-medium">{user?.email}</p>
                                <p className="text-[10px] text-slate-600 capitalize">{user?.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                        >
                            Logout
                        </button>

                        {/* Mobile toggle */}
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-slate-400 hover:text-white p-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                {mobileOpen && (
                    <div className="md:hidden pb-3 space-y-1 animate-fade-in">
                        {links.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {link.icon} {link.label}
                            </Link>
                        ))}
                        {user?.role === 'founder' && founderMore.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setMobileOpen(false)}
                                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {link.icon} {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
