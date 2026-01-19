import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        rollNumber: '',
        department: '',
        section: '',
        year: '',
        mobile: '',
        studentType: '',
        gender: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const { name, email, password, confirmPassword, rollNumber, department, section, year, mobile, studentType, gender } = formData;

    const onChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError(''); // Clear global errors on type
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Client Side Validation
        if (!email.endsWith('@kongu.edu')) {
            setError('Please use your @kongu.edu email');
            return;
        }


        // Validation: Mandatory Fields
        if (!gender || !department || !section || !year) {
            setError('All fields are mandatory');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,10}$/;
        if (!passwordRegex.test(password)) {
            setError('Password must be 6-10 characters long, contain 1 uppercase, 1 lowercase, and 1 special character.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Remove confirmPassword from data sent to backend
        const { confirmPassword: _, ...submissionData } = formData;

        const res = await register(submissionData);

        if (res.success) {
            setSuccess(res.message || 'Registration successful! Please check your email to verify your account.');
            setError('');
            setFormData({
                name: '', email: '', password: '', confirmPassword: '', rollNumber: '', department: '', section: '', year: '', mobile: '', studentType: '', gender: ''
            });
        } else {
            setError(res.message);
            setSuccess('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                        Student Registration
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Fill in all details correctly to access your dashboard.
                    </p>
                </div>
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
                        <p className="text-sm text-green-700">{success}</p>
                        <button onClick={() => navigate('/login')} className="mt-2 text-sm font-medium text-green-800 underline">
                            Go to login
                        </button>
                    </div>
                )}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input name="name" type="text" required className="input-field" value={name} onChange={onChange} />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (@kongu.edu)</label>
                            <input name="email" type="email" required className="input-field" value={email} onChange={onChange} />
                        </div>

                        {/* Roll Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                            <input name="rollNumber" type="text" required className="input-field" value={rollNumber} onChange={onChange} />
                        </div>

                        {/* Mobile */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                            <input name="mobile" type="text" pattern="\d{10}" title="10 digit mobile number" required className="input-field" value={mobile} onChange={onChange} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select name="department" required className="select-field" value={department} onChange={onChange}>
                                <option value="">Select Department</option>
                                <option value="AIDS">AIDS</option>
                                <option value="AIML">AIML</option>
                                <option value="AUTO">AUTO</option>
                                <option value="BSC">BSC</option>
                                <option value="CHEM">CHEM</option>
                                <option value="CIVIL">CIVIL</option>
                                <option value="CSD">CSD</option>
                                <option value="CSE">CSE</option>
                                <option value="ECE">ECE</option>
                                <option value="EEE">EEE</option>
                                <option value="EIE">EIE</option>
                                <option value="FT">FT</option>
                                <option value="IT">IT</option>
                                <option value="MBA">MBA</option>
                                <option value="MCA">MCA</option>
                                <option value="MECH">MECH</option>
                                <option value="MTS">MTS</option>
                            </select>
                        </div>

                        {/* Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                            <select name="section" required className="select-field" value={section} onChange={onChange}>
                                <option value="">Select Section</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                                <option value="F">F</option>
                            </select>
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                            <select name="year" required className="select-field" value={year} onChange={onChange}>
                                <option value="">Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                                <option value="5">5th Year</option>
                            </select>
                        </div>

                        {/* Student Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Student Type</label>
                            <select name="studentType" required className="select-field" value={studentType} onChange={onChange}>
                                <option value="">Select Type</option>
                                <option value="Day Scholar">Day Scholar</option>
                                <option value="Hosteller">Hosteller</option>
                            </select>
                        </div>

                        {/* Gender (Mandatory for All) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select name="gender" required className="select-field" value={gender} onChange={onChange}>
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        {/* Password - Moved to bottom */}
                        <div className={studentType === 'Hosteller' ? "" : ""} > {/* Auto flow in grid */}
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="input-field pr-10"
                                    value={password}
                                    onChange={onChange}
                                    placeholder="Enter your password"
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

                        {/* Confirm Password */}
                        <div className={studentType === 'Hosteller' ? "" : ""} >
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    className={`input-field pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                                    value={confirmPassword}
                                    onChange={onChange}
                                    placeholder="Confirm your password"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
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
                            {confirmPassword && password !== confirmPassword && (
                                <p className="text-xs text-red-600 mt-1 font-medium">
                                    Passwords do not match
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <button type="submit" className="w-full btn-primary flex justify-center py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                            Create Account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
