import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useModal } from '../context/ModalContext';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // eslint-disable-next-line no-unused-vars
    const { token } = useParams();
    const navigate = useNavigate();
    const { showModal } = useModal();

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic validation
        if (password !== confirmPassword) {
            showModal({ type: 'error', message: 'Passwords do not match' });
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,10}$/;
        if (!passwordRegex.test(password)) {
            showModal({ type: 'error', message: 'Password must be 6-10 characters long, contain 1 uppercase, 1 lowercase, and 1 special character.' });
            return;
        }

        try {
            await axios.put(`/api/auth/reset-password/${token}`, { password });
            showModal({
                type: 'success',
                message: 'Password reset successful! You can now login.',
                onConfirm: () => navigate('/login')
            });
        } catch (err) {
            showModal({ type: 'error', message: err.response?.data?.message || 'Failed to reset password' });
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 card">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-sky-600 tracking-tight">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter a new password for your account.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="input-field pr-10"
                                    placeholder="New Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Password must be 6–10 characters long and include 1 uppercase letter, 1 lowercase letter, and 1 special character.
                            </p>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                required
                                className="input-field"
                                placeholder="Confirm New Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="w-full btn-primary flex justify-center py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                            Set New Password
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
