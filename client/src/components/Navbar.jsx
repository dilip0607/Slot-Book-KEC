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
        <nav className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <Link to="/" className="flex items-center gap-3 group">
                        <img
                            src="/kecnewlogo.jpg"
                            alt="KEC Logo"
                            className="h-14 w-auto group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="flex flex-col">
                            <h1 className="text-lg sm:text-2xl font-bold text-[#0ea5e9] tracking-tight leading-none uppercase font-serif">
                                Kongu Engineering College
                            </h1>
                            <span className="text-[10px] sm:text-xs font-semibold text-[#22c55e] tracking-[0.2em] uppercase">
                                Transform Yourself
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <div className="hidden sm:flex items-center bg-[#f0f9ff] px-3 py-1.5 rounded-full border border-[#0ea5e9]/20">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                    <span className="text-sm font-medium text-[#0ea5e9]">{user.name}</span>
                                </div>
                                {user.role === 'ADMIN' && (
                                    <Link to="/admin" className="text-sm font-medium text-gray-600 hover:text-[#0ea5e9] transition-colors">Dashboard</Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="text-sm font-medium text-white bg-[#0ea5e9] hover:bg-[#0284c7] px-4 py-2 rounded-lg transition-colors shadow-sm"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-[#0ea5e9] transition-colors">Login</Link>
                                <Link to="/register" className="text-sm font-medium text-white bg-[#0ea5e9] hover:bg-[#0284c7] px-5 py-2 rounded-lg shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5">Register</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
