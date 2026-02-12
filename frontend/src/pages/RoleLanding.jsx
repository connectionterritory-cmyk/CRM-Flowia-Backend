import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { getDefaultRouteForRole, getUserRole } from '../utils/roles';

const RoleLanding = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            </div>
        );
    }

    const role = getUserRole(user);
    return <Navigate to={getDefaultRouteForRole(role)} replace />;
};

export default RoleLanding;
