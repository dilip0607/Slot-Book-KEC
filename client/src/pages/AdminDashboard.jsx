import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [title, setTitle] = useState('');
    const [testDate, setTestDate] = useState('');
    const [totalSlots, setTotalSlots] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expandedEvent, setExpandedEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);

    const fetchEvents = async () => {
        try {
            const { data } = await axios.get('http://localhost:3001/api/events', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setEvents(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, [user.token]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.post('http://localhost:3001/api/events',
                { title, testDate, totalSlots: Number(totalSlots) },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setSuccess('Event created successfully');
            setTitle('');
            setTestDate('');
            setTotalSlots('');
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create event');
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event? This action will close registrations.')) return;
        try {
            await axios.delete(`http://localhost:3001/api/events/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            fetchEvents();
        } catch (err) {
            alert('Failed to delete event');
        }
    };

    const handleViewRegistrations = async (eventId) => {
        if (expandedEvent === eventId) {
            setExpandedEvent(null);
            return;
        }

        try {
            const { data } = await axios.get(`http://localhost:3001/api/events/${eventId}/registrations`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setRegistrations(data);
            setExpandedEvent(eventId);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-8">Admin Dashboard</h1>

            {/* Create Event Section */}
            <div className="card mb-10 transform transition-all hover:shadow-2xl">
                <div className="border-b border-gray-100 pb-5 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Create New Event</h2>
                    <p className="text-gray-500 mt-1">Set up a new assessment or registration slot</p>
                </div>

                {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6 border-l-4 border-red-500">{error}</div>}
                {success && <div className="bg-green-50 text-green-700 p-4 rounded mb-6 border-l-4 border-green-500">{success}</div>}

                <form onSubmit={handleCreateEvent} className="grid grid-cols-1 gap-8 md:grid-cols-4 items-end">
                    <div className="col-span-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. Final Exam" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Test Date</label>
                        <input type="date" required value={testDate} onChange={(e) => setTestDate(e.target.value)} className="input-field" />
                    </div>
                    <div className="col-span-1">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Slots</label>
                        <input type="number" required value={totalSlots} onChange={(e) => setTotalSlots(e.target.value)} className="input-field" placeholder="100" />
                    </div>
                    <div className="col-span-1">
                        <button type="submit" className="w-full btn-primary h-[50px] shadow-lg">Create Event</button>
                    </div>
                </form>
            </div>

            {/* Events List */}
            <div className="card">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Manage Events</h2>
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Slots</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {events.map((event) => (
                                <React.Fragment key={event._id}>
                                    <tr className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{event.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(event.testDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            <div className="flex items-center">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 w-24">
                                                    <div className={`h-2.5 rounded-full ${event.bookedSlots >= event.totalSlots ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((event.bookedSlots / event.totalSlots) * 100, 100)}%` }}></div>
                                                </div>
                                                <span className="text-xs">{event.bookedSlots}/{event.totalSlots}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {event.bookedSlots >= event.totalSlots ?
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                    Full
                                                </span> :
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    Open
                                                </span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                            <button onClick={() => handleDeleteEvent(event._id)} className="text-red-500 hover:text-red-700 font-semibold transition-colors">Delete</button>
                                            <button onClick={() => handleViewRegistrations(event._id)} className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                                                {expandedEvent === event._id ? 'Hide' : 'View'} Registrations
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedEvent === event._id && (
                                        <tr>
                                            <td colSpan="5" className="bg-indigo-50/50 px-6 py-6 border-b border-indigo-100">
                                                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4">Registrations for {event.title}</h3>
                                                {registrations.length === 0 ? (
                                                    <p className="text-gray-500 text-sm italic">No registrations found.</p>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {registrations.map(reg => (
                                                            <div key={reg._id} className="bg-white p-3 rounded border border-indigo-100 shadow-sm flex items-center">
                                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold mr-3 text-xs">
                                                                    {reg.user.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{reg.user.name}</p>
                                                                    <p className="text-xs text-gray-500">{reg.user.email}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
