import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { getDefaultRouteForRole, getUserRole } from '../utils/roles';

const RoleRoute = ({ allow = [], children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    const role = getUserRole(user);
    if (allow.length > 0 && !allow.includes(role)) {
        return <Navigate to={getDefaultRouteForRole(role)} replace />;
    }

    return children;
};

export default RoleRoute;
