import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState(''); // 'success' or 'error'

    const fetchData = async () => {
        try {
            const [eventsRes, myRegsRes] = await Promise.all([
                axios.get('/api/events', { headers: { Authorization: `Bearer ${user.token}` } }),
                axios.get('/api/my-registrations', { headers: { Authorization: `Bearer ${user.token}` } })
            ]);

            setEvents(eventsRes.data.filter(e => e.isActive));
            setMyRegistrations(myRegsRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user.token]);

    const handleRegister = async (eventId) => {
        setMessage('');
        try {
            await axios.post('/api/register',
                { eventId },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setMessage('Slot confirmed successfully.');
            setMsgType('success');
            fetchData();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Registration failed');
            setMsgType('error');
            fetchData();
        }
    };

    const handleCancel = async (regId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await axios.delete(`/api/registrations/${regId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setMessage('Booking cancelled successfully.');
            setMsgType('success');
            fetchData();
        } catch (err) {
            setMessage(err.response?.data?.message || 'Cancellation failed');
            setMsgType('error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600 mb-2">User Dashboard</h1>
            <p className="text-gray-500 mb-8">Manage your bookings and explore new slots.</p>

            {message && (
                <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-sm ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
                    <p className="font-medium">{message}</p>
                </div>
            )}

            {/* My Bookings Section */}
            {myRegistrations.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        My Registered Slots
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myRegistrations.map((reg) => (
                            <div key={reg._id} className="bg-white border-2 border-indigo-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{reg.event?.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    {new Date(reg.event?.testDate).toLocaleDateString()}
                                </p>
                                <button
                                    onClick={() => handleCancel(reg._id)}
                                    className="w-full py-2 rounded-lg text-red-600 font-semibold text-sm border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all"
                                >
                                    Cancel Registration
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Events</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {events.map((event) => {
                    const isFull = event.bookedSlots >= event.totalSlots;
                    const percentFull = Math.min((event.bookedSlots / event.totalSlots) * 100, 100);

                    return (
                        <div key={event._id} className="card group hover:shadow-2xl transition-all duration-300 flex flex-col justify-between border-t-4 border-indigo-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2">
                                {isFull ? (
                                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Full</span>
                                ) : (
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Open</span>
                                )}
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                <p className="text-sm text-gray-500 mb-4 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    {new Date(event.testDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                </p>

                                <div className="mb-6">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-xs font-medium text-gray-500">Availability</span>
                                        <span className={`text-sm font-bold ${isFull ? 'text-red-600' : 'text-indigo-600'}`}>
                                            {event.bookedSlots} / {event.totalSlots}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                                            style={{ width: `${percentFull}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleRegister(event._id)}
                                disabled={isFull}
                                className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-200 transform active:scale-95 shadow-md ${isFull
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg'
                                    }`}
                            >
                                {isFull ? 'Sold Out' : 'Confirm Slot'}
                            </button>
                        </div>
                    );
                })}
                {events.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No events active</h3>
                        <p className="mt-1 text-sm text-gray-500">Check back later for new slots.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;
