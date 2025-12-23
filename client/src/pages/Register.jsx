import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
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
    const { register } = useAuth();
    const navigate = useNavigate();

    const { name, email, password, rollNumber, department, section, year, mobile, studentType, gender } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Basic Client Side Validation
        if (!email.endsWith('@kongu.edu')) {
            setError('Please use your @kongu.edu email');
            return;
        }

        if (studentType === 'Hosteller' && !gender) {
            setError('Gender is required for Hostellers');
            return;
        }

        const res = await register(formData);

        if (res.success) {
            setSuccess(res.message || 'Registration successful! Please check your email to verify your account.');
            setError('');
            setFormData({
                name: '', email: '', password: '', rollNumber: '', department: '', section: '', year: '', mobile: '', studentType: '', gender: ''
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
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                        {/* Name */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input name="name" type="text" required className="input-field mt-1" value={name} onChange={onChange} />
                        </div>

                        {/* Email */}
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Email (@kongu.edu)</label>
                            <input name="email" type="email" required className="input-field mt-1" value={email} onChange={onChange} />
                        </div>

                        {/* Roll Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                            <input name="rollNumber" type="text" required className="input-field mt-1" value={rollNumber} onChange={onChange} />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input name="password" type="password" required className="input-field mt-1" value={password} onChange={onChange} />
                        </div>

                        {/* Mobile */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                            <input name="mobile" type="text" pattern="\d{10}" title="10 digit mobile number" required className="input-field mt-1" value={mobile} onChange={onChange} />
                        </div>

                        {/* Year */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Year</label>
                            <select name="year" required className="input-field mt-1" value={year} onChange={onChange}>
                                <option value="">Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <input name="department" type="text" placeholder="e.g. CSE" required className="input-field mt-1" value={department} onChange={onChange} />
                        </div>

                        {/* Section */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Section (Optional)</label>
                            <input name="section" type="text" className="input-field mt-1" value={section} onChange={onChange} />
                        </div>

                        {/* Student Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Student Type</label>
                            <select name="studentType" required className="input-field mt-1" value={studentType} onChange={onChange}>
                                <option value="">Select Type</option>
                                <option value="Day Scholar">Day Scholar</option>
                                <option value="Hosteller">Hosteller</option>
                            </select>
                        </div>

                        {/* Gender (Conditional) */}
                        {studentType === 'Hosteller' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Gender</label>
                                <select name="gender" required className="input-field mt-1" value={gender} onChange={onChange}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Boy</option>
                                    <option value="Female">Girl</option>
                                </select>
                            </div>
                        )}
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
