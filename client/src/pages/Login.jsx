import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import axios from 'axios';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
    const [showForgot, setShowForgot] = useState(false);

    // Removed local error/success states in favor of Modal
    // const [error, setError] = useState('');
    // const [success, setSuccess] = useState('');

    const { login } = useAuth();
    const { showModal } = useModal();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('verified') === 'true') {
            showModal({ type: 'success', message: 'Email verified successfully! You can now log in.' });
        }
    }, [location, showModal]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await login(email, password);
        if (res.success) {
            if (res.isAdmin) {
                navigate('/admin');
            } else {
                navigate('/');
            }
        } else {
            showModal({ type: 'error', message: res.message });
        }
    };

    const handleForgotPassword = async () => {
        if (!forgotPasswordEmail) {
            showModal({ type: 'info', message: 'Please enter your email first.' });
            return;
        }
        try {
            await axios.post('/api/auth/forgot-password', { email: forgotPasswordEmail });
            showModal({ type: 'success', message: 'Password reset link sent to your email.' });
            setForgotPasswordEmail('');
            setShowForgot(false);
        } catch (err) {
            showModal({ type: 'error', message: err.response?.data?.message || 'Failed to send email' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 card relative">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-sky-600 tracking-tight">
                        Welcome Back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to access your dashboard
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="input-field"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <button type="button" onClick={() => setShowForgot(true)} className="font-medium text-sky-600 hover:text-sky-500">
                                Forgot your password?
                            </button>
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="w-full btn-primary flex justify-center py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                            Sign in
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                            Don't have an account? <Link to="/register" className="font-medium text-sky-600 hover:text-sky-500">Register here</Link>
                        </p>
                    </div>
                </form>

                {/* Forgot Password Overlay */}
                {showForgot && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl p-8 flex flex-col justify-center items-center z-10 animate-fade-in border border-sky-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Reset Password</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center">Enter your email address and we'll send you a link to reset your password.</p>
                        <input
                            type="email"
                            className="input-field mb-4 w-full"
                            placeholder="Enter your email"
                            value={forgotPasswordEmail}
                            onChange={e => setForgotPasswordEmail(e.target.value)}
                        />
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowForgot(false)} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                            <button onClick={handleForgotPassword} className="flex-1 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 font-medium transition-colors shadow-md">Send Link</button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Login;
