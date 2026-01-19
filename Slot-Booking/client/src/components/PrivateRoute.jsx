import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ adminOnly = false }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (adminOnly && user.role !== 'ADMIN') {
        return <Navigate to="/" />;
    }

    return <Outlet />;
};

export default PrivateRoute;
