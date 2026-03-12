import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
    children: React.ReactNode;
    requiredRole?: 'founder' | 'investor' | 'admin';
}

const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) return <Navigate to="/" replace />;
    if (requiredRole && user.role !== requiredRole) {
        const redirect = user.role === 'admin' ? '/admin' : user.role === 'investor' ? '/investor' : '/dashboard';
        return <Navigate to={redirect} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
