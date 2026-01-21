import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const UserDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [message, setMessage] = useState('');
    const [msgType, setMsgType] = useState(''); // 'success' or 'error'
    const [searchTerm, setSearchTerm] = useState('');

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
        if (user && user.token) {
            fetchData();
        }
    }, [user]);

    const handleRegister = async (eventId, slotId) => {
        setMessage('');
        try {
            await axios.post('/api/register',
                { eventId, slotId },
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

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to find slot details for my registrations
    const getSlotDetails = (event, slotId) => {
        if (!event || !event.slots || !slotId) return null;
        return event.slots.find(s => s._id === slotId);
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-700 to-sky-600 mb-2">User Dashboard</h1>
                    <p className="text-gray-500">Welcome, {user?.name} ({user?.studentType})</p>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none w-full md:w-64"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            {message && (
                <div className={`p-4 mb-6 rounded-lg border-l-4 shadow-sm ${msgType === 'success' ? 'bg-green-50 text-green-700 border-green-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
                    <p className="font-medium">{message}</p>
                </div>
            )}

            {/* My Bookings Section */}
            {myRegistrations.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                        <svg className="w-6 h-6 mr-2 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                        My Registered Slots
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myRegistrations.map((reg) => {
                            // Since we populate event, we might need to find the slot details from the event object if populated
                            // Note: Previous backend populate was just 'event'. We might need to populate 'event.slots' (it is by default).
                            // But `reg.slotId` helps us find which one.
                            // If `reg.event` is null (deleted event), handle gracefully.
                            const slot = reg.event ? reg.event.slots.find(s => s._id === reg.slotId) : null;

                            return (
                                <div key={reg._id} className="bg-white border-2 border-sky-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{reg.event?.title || 'Unknown Event'}</h3>
                                    <p className="text-sm text-gray-500 mb-1">
                                        <span className="font-semibold">Slot Time:</span> {slot ?
                                            `${new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date(slot.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                            : 'N/A'}
                                    </p>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Registered on: {new Date(reg.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                    </p>
                                    <button
                                        onClick={() => handleCancel(reg._id)}
                                        className="w-full py-2 rounded-lg text-red-600 font-semibold text-sm border-2 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all"
                                    >
                                        Cancel Registration
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <h2 className="text-2xl font-bold text-gray-800 mb-6">Available Events</h2>
            <div className="grid grid-cols-1 gap-8">
                {filteredEvents.map((event) => (
                    <div key={event._id} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                        <div className="bg-sky-600 p-4">
                            <h3 className="text-xl font-bold text-white">{event.title}</h3>
                            <p className="text-white/90 text-base font-medium mt-3 leading-relaxed">{event.description || 'No description provided.'}</p>
                            <span className="inline-block mt-2 bg-sky-800 text-xs px-2 py-1 rounded text-sky-100">
                                For: {event.targetAudience}
                            </span>
                        </div>

                        <div className="p-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Select a Slot</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {event.slots.map((slot) => {
                                    const isFull = slot.bookedSlots >= slot.totalSlots;
                                    const percent = Math.min((slot.bookedSlots / slot.totalSlots) * 100, 100);

                                    return (
                                        <div key={slot._id} className={`border rounded-lg p-4 relative ${isFull ? 'bg-gray-50 border-gray-200' : 'bg-white border-sky-100 hover:border-sky-300'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {new Date(slot.startTime).toLocaleString('en-IN', {
                                                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                                    })}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {new Date(slot.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} -
                                                        {new Date(slot.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </div>
                                                </div>
                                                {isFull ? (
                                                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">FULL</span>
                                                ) : (
                                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded">OPEN</span>
                                                )}
                                            </div>

                                            <div className="mt-2 mb-3">
                                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                    <span>Capacity</span>
                                                    <span>{slot.bookedSlots} / {slot.totalSlots}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${isFull ? 'bg-red-400' : 'bg-sky-500'}`} style={{ width: `${percent}%` }}></div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleRegister(event._id, slot._id)}
                                                disabled={isFull}
                                                className={`w-full py-2 text-sm font-semibold rounded transition-colors ${isFull
                                                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                                    : 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                                                    }`}
                                            >
                                                {isFull ? 'Unavailable' : 'Book Slot'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {events.length === 0 && (
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 py-20 flex flex-col items-center justify-center bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <h3 className="text-xl font-bold text-gray-700">No Events Found</h3>
                        <p className="text-gray-500 mt-2 text-center max-w-sm">There are no active events for your category (Department/Batch/Gender) at this moment.</p>
                        <button onClick={fetchData} className="mt-6 px-6 py-2 bg-sky-50 text-sky-600 rounded-full font-semibold hover:bg-sky-100 transition-colors">
                            Refresh Events
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDashboard;
