import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link to="/" className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
                                FCFS<span className="font-light text-gray-500">Booking</span>
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    <span className="text-sm font-medium text-gray-700">{user.name}</span>
                                </div>
                                {user.role === 'ADMIN' && (
                                    <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Dashboard</Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors shadow-sm"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Login</Link>
                                <Link to="/register" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5">Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
