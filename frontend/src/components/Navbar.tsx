import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const isActive = (path: string) => location.pathname === path;

    const founderLinks = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/metrics/new', label: 'Submit Metrics', icon: '📝' },
        { path: '/history', label: 'History', icon: '📈' },
        { path: '/profile', label: 'Profile', icon: '⚙️' },
    ];

    const adminLinks = [
        { path: '/admin', label: 'Admin Dashboard', icon: '🏛️' },
    ];

    const links = user?.role === 'admin' ? adminLinks : founderLinks;

    return (
        <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-indigo-500/10 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                            NS
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                            NSPMS
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {links.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive(link.path)
                                        ? 'bg-indigo-500/15 text-indigo-300'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                            >
                                <span className="mr-1.5">{link.icon}</span>
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* User Menu */}
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 hidden sm:block">
                            {user?.email} ({user?.role})
                        </span>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>

                {/* Mobile Nav */}
                <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
                    {links.map(link => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive(link.path)
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            {link.icon} {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
