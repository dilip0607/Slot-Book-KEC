import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState(''); // 'success' or 'error'

    const fetchEvents = async () => {
        try {
            const { data } = await axios.get('/api/events', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Users should only see active events? 
            // Admin lists all. User dashboard should probably show all but indicate status?
            // "View only active events" -> Requirement.
            // But controller returns all. I should filter client side or API side.
            // I'll filter client side for better UX (show full ones too?)
            // Requirement: "View only active events". Deleted events are removed. Inactive?
            // My model has `isActive`.
            setEvents(data.filter(e => e.isActive));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEvents();
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
            fetchEvents(); // Refresh to show updated slots
        } catch (err) {
            setMessage(err.response?.data?.message || 'Registration failed');
            setMsgType('error');
            fetchEvents(); // Refresh to show true state
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-600 mb-2">Available Events</h1>
            <p className="text-gray-500 mb-8">Book your slot before time runs out!</p>

            {message && (
                <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-sm ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
                    <p className="font-medium">{message}</p>
                </div>
            )}

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
