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
    const [isEditing, setIsEditing] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchEvents = async () => {
        try {
            const { data } = await axios.get('/api/events', {
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
            await axios.post('/api/events',
                { title, testDate, totalSlots: Number(totalSlots) },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setSuccess('Event created successfully');
            resetForm();
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create event');
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.put(`/api/events/${editingEventId}`,
                { title, testDate, totalSlots: Number(totalSlots) },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setSuccess('Event updated successfully');
            resetForm();
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update event');
        }
    };

    const resetForm = () => {
        setTitle('');
        setTestDate('');
        setTotalSlots('');
        setIsEditing(false);
        setEditingEventId(null);
    };

    const startEditing = (event) => {
        setIsEditing(true);
        setEditingEventId(event._id);
        setTitle(event.title);
        setTestDate(new Date(event.testDate).toISOString().split('T')[0]);
        setTotalSlots(event.totalSlots);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to delete this event? This action will close registrations.')) return;
        try {
            await axios.delete(`/api/events/${id}`, {
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
            const { data } = await axios.get(`/api/events/${eventId}/registrations`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setRegistrations(data);
            setExpandedEvent(eventId);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExportExcel = async (eventId, eventTitle) => {
        try {
            const response = await axios.get(`/api/events/${eventId}/export`, {
                headers: { Authorization: `Bearer ${user.token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Registrations_${eventTitle.replace(/\s+/g, '_')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            alert('Failed to export Excel');
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-8">Admin Dashboard</h1>

            {/* Create Event Section */}
            <div className="card mb-10 transform transition-all hover:shadow-2xl">
                <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
                        <p className="text-gray-500 mt-1">{isEditing ? 'Update event details' : 'Set up a new assessment or registration slot'}</p>
                    </div>
                    {isEditing && (
                        <button onClick={resetForm} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Cancel Edit</button>
                    )}
                </div>

                {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6 border-l-4 border-red-500">{error}</div>}
                {success && <div className="bg-green-50 text-green-700 p-4 rounded mb-6 border-l-4 border-green-500">{success}</div>}

                <form onSubmit={isEditing ? handleUpdateEvent : handleCreateEvent} className="grid grid-cols-1 gap-8 md:grid-cols-4 items-end">
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
                        <button type="submit" className={`w-full h-[50px] shadow-lg rounded-lg font-bold text-white transition-all ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {isEditing ? 'Update Event' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Events List */}
            <div className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Manage Events</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full md:w-64"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                </div>
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
                            {filteredEvents.map((event) => (
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
                                            <button onClick={() => startEditing(event)} className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">Edit</button>
                                            <button onClick={() => handleDeleteEvent(event._id)} className="text-red-500 hover:text-red-700 font-semibold transition-colors">Delete</button>
                                            <button onClick={() => handleViewRegistrations(event._id)} className="text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                                                {expandedEvent === event._id ? 'Hide' : 'View'} Registrations
                                            </button>
                                            <button onClick={() => handleExportExcel(event._id, event.title)} className="text-green-600 hover:text-green-800 font-semibold transition-colors">
                                                Export Excel
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
