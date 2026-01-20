import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const TimePicker = ({ value, onChange, className }) => {
    let hour = '12', minute = '00', period = 'AM';
    if (value) {
        const [h, m] = value.split(':');
        let hNum = parseInt(h, 10);
        period = hNum >= 12 ? 'PM' : 'AM';
        if (hNum > 12) hNum -= 12;
        if (hNum === 0) hNum = 12;
        hour = hNum.toString().padStart(2, '0');
        minute = m;
    }

    const handleChange = (type, val) => {
        let hNum = parseInt(hour, 10);
        let mStr = minute;
        let pStr = period;

        if (type === 'hour') hNum = parseInt(val, 10);
        if (type === 'minute') mStr = val;
        if (type === 'period') pStr = val;

        if (pStr === 'PM' && hNum < 12) hNum += 12;
        if (pStr === 'AM' && hNum === 12) hNum = 0;

        onChange(`${hNum.toString().padStart(2, '0')}:${mStr}`);
    };

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <select value={hour} onChange={(e) => handleChange('hour', e.target.value)} className="input-field px-1 py-2 text-sm w-16 appearance-none text-center">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                ))}
            </select>
            <span className="font-bold text-gray-400">:</span>
            <select value={minute} onChange={(e) => handleChange('minute', e.target.value)} className="input-field px-1 py-2 text-sm w-16 appearance-none text-center">
                {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <select value={period} onChange={(e) => handleChange('period', e.target.value)} className="input-field px-1 py-2 text-sm w-16 appearance-none text-center ml-1">
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
};

const AdminDashboard = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetAudience, setTargetAudience] = useState('Common');
    // State for slots now needs separate date, start time, end time
    const [slots, setSlots] = useState([{ date: '', startTime: '', endTime: '', totalSlots: '' }]);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expandedEvent, setExpandedEvent] = useState(null);
    const [registrations, setRegistrations] = useState([]);
    // Editing not fully supported for multi-slots in this simplified version, restricting to creation/deletion for now
    // or we can allow editing title/desc/audience.
    const [isEditing, setIsEditing] = useState(false);
    const [editingEventId, setEditingEventId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archive'
    const [archivedEvents, setArchivedEvents] = useState([]);
    const [expandedArchivedEvent, setExpandedArchivedEvent] = useState(null);

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

    const fetchArchivedEvents = async () => {
        try {
            const { data } = await axios.get('/api/events/archived', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setArchivedEvents(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (user && user.token) {
            fetchEvents();
            if (activeTab === 'archive') {
                fetchArchivedEvents();
            }
        }
    }, [user, activeTab]);

    // Slot Management Helpers
    const handleSlotChange = (index, field, value) => {
        const newSlots = [...slots];
        newSlots[index][field] = value;
        setSlots(newSlots);
    };

    const addSlot = () => {
        setSlots([...slots, { date: '', startTime: '', endTime: '', totalSlots: '' }]);
    };

    const removeSlot = (index) => {
        if (slots.length > 1) {
            const newSlots = slots.filter((_, i) => i !== index);
            setSlots(newSlots);
        }
    };

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Basic validation
        if (slots.some(s => !s.date || !s.startTime || !s.endTime || !s.totalSlots)) {
            setError('Please fill in all slot details (Date, Start Time, End Time, Capacity).');
            return;
        }

        // Validate End Time > Start Time
        for (const slot of slots) {
            if (slot.startTime >= slot.endTime) {
                setError('End Time must be after Start Time for all slots.');
                return;
            }
        }

        try {
            await axios.post('/api/events',
                {
                    title,
                    description,
                    targetAudience,
                    slots: slots.map(s => {
                        // Construct Date objects in Browser's Local Time (IST)
                        const start = new Date(`${s.date}T${s.startTime}`);
                        const end = new Date(`${s.date}T${s.endTime}`);
                        return {
                            totalSlots: Number(s.totalSlots),
                            // Send UTC ISO strings to backend
                            startTime: start.toISOString(),
                            endTime: end.toISOString()
                        };
                    })
                },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            setSuccess('Event created successfully');
            resetForm();
            fetchEvents();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create event');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setTargetAudience('Common');
        setSlots([{ date: '', startTime: '', endTime: '', totalSlots: '' }]);
        setIsEditing(false);
        setEditingEventId(null);
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm('Are you sure you want to move this event to the Recycle Bin? It will be retained for 30 days.')) return;
        try {
            const res = await axios.delete(`/api/events/${id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            // Update UI state
            setSuccess('Event moved to Recycle Bin. It will be permanently deleted after 30 days.');
            setError('');

            // Refresh both lists to ensure data consistency
            fetchEvents();
            fetchArchivedEvents();

            // Scroll to top to show success message
            window.scrollTo(0, 0);
        } catch (err) {
            console.error(err);
            setError('Failed to move event to Recycle Bin');
            setSuccess('');
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
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-700 to-sky-600 mb-8">Admin Dashboard</h1>

            {/* Tabs */}
            <div className="flex space-x-4 mb-8">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'active' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Active Events
                </button>
                <button
                    onClick={() => setActiveTab('archive')}
                    className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    Recycle Bin
                </button>
            </div>

            {activeTab === 'active' ? (
                <>
                    {/* Create Event Section */}
                    <div className="card mb-10 transform transition-all hover:shadow-2xl bg-white p-6 rounded-xl border border-gray-100">
                        <div className="border-b border-gray-100 pb-5 mb-6 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">Create New Event</h2>
                                <p className="text-gray-500 mt-1">Configure event details.</p>
                            </div>
                        </div>

                        {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6 border-l-4 border-red-500">{error}</div>}
                        {success && <div className="bg-green-50 text-green-700 p-4 rounded mb-6 border-l-4 border-green-500">{success}</div>}

                        <form onSubmit={handleCreateEvent} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Event Title</label>
                                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. End Semester Exam" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
                                    <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="select-field">
                                        <option value="Common">Common (All)</option>
                                        <option value="Hosteller">Hosteller Only</option>
                                        <option value="Day Scholar">Day Scholar Only</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" rows="2" placeholder="Brief details about the event..."></textarea>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Time Slots Configuration</label>
                                {slots.map((slot, index) => (
                                    <div key={index} className="flex flex-col md:flex-row gap-4 mb-4 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={slot.date}
                                                onChange={(e) => handleSlotChange(index, 'date', e.target.value)}
                                                className="input-field w-full cursor-pointer"
                                            />
                                        </div>
                                        <div className="w-full md:w-32">
                                            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                                            <TimePicker
                                                value={slot.startTime}
                                                onChange={(val) => handleSlotChange(index, 'startTime', val)}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="w-full md:w-32">
                                            <label className="block text-xs text-gray-500 mb-1">End Time</label>
                                            <TimePicker
                                                value={slot.endTime}
                                                onChange={(val) => handleSlotChange(index, 'endTime', val)}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="w-full md:w-24">
                                            <label className="block text-xs text-gray-500 mb-1">Capacity</label>
                                            <input
                                                type="number"
                                                required
                                                value={slot.totalSlots}
                                                onChange={(e) => handleSlotChange(index, 'totalSlots', e.target.value)}
                                                className="input-field"
                                                placeholder="Qty"
                                            />
                                        </div>
                                        <div className="pb-1">
                                            {slots.length > 1 && (
                                                <button type="button" onClick={() => removeSlot(index)} className="text-red-500 hover:text-red-700 font-bold px-2">
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button type="button" onClick={addSlot} className="text-sm font-semibold text-sky-600 hover:text-sky-800 flex items-center mt-2">
                                    + Add Another Slot
                                </button>
                            </div>

                            <div>
                                <button type="submit" className="w-full h-[50px] shadow-lg rounded-lg font-bold text-white bg-sky-600 hover:bg-sky-700 transition-all">
                                    Create Event
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
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none w-full md:w-64"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Audience</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Slots</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Capacity</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredEvents.map((event) => {
                                        const totalCapacity = event.slots.reduce((acc, s) => acc + s.totalSlots, 0);
                                        const totalBooked = event.slots.reduce((acc, s) => acc + s.bookedSlots, 0);
                                        return (
                                            <React.Fragment key={event._id}>
                                                <tr className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{event.title}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{event.targetAudience}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{event.slots.length}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                                        <div className="flex items-center">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 w-24">
                                                                <div className={`h-2.5 rounded-full ${totalBooked >= totalCapacity ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((totalBooked / totalCapacity) * 100, 100)}%` }}></div>
                                                            </div>
                                                            <span className="text-xs">{totalBooked}/{totalCapacity}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                                        <button onClick={() => handleDeleteEvent(event._id)} className="text-red-500 hover:text-red-700 font-semibold transition-colors">Delete</button>
                                                        <button onClick={() => handleExportExcel(event._id, event.title)} className="text-green-600 hover:text-green-800 font-semibold transition-colors">
                                                            Export Excel
                                                        </button>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Archived Events Section */
                <div className="card">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Recycle Bin (Archived Events - 30 Days Retention)</h2>
                    {archivedEvents.length === 0 ? (
                        <p className="text-gray-500 italic">No archived events found.</p>
                    ) : (
                        <div className="space-y-6">
                            {archivedEvents.map(event => (
                                <div key={event._id} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{event.title}</h3>
                                            <p className="text-sm text-gray-500 mt-1">Archived on: {new Date(event.deletedAt).toLocaleDateString()}</p>
                                            <span className="inline-block mt-2 bg-gray-200 text-xs px-2 py-1 rounded text-gray-700">
                                                For: {event.targetAudience}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setExpandedArchivedEvent(expandedArchivedEvent === event._id ? null : event._id)}
                                            className="text-sky-600 hover:text-sky-800 font-semibold text-sm"
                                        >
                                            {expandedArchivedEvent === event._id ? 'Hide Details' : 'View Details'}
                                        </button>
                                    </div>

                                    {expandedArchivedEvent === event._id && (
                                        <div className="mt-6 border-t border-gray-100 pt-6">
                                            <h4 className="text-sm font-bold text-gray-700 uppercase mb-4">Event Details</h4>
                                            <p className="text-sm text-gray-600 mb-2"><strong>Description:</strong> {event.description || 'N/A'}</p>
                                            <p className="text-sm text-gray-600 mb-4"><strong>Total Registrations:</strong> {event.registrations.length}</p>

                                            <h4 className="text-sm font-bold text-gray-700 uppercase mb-4">Registered Students</h4>
                                            {event.registrations.length === 0 ? (
                                                <p className="text-gray-500 text-sm italic">No registrations for this event.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Roll No</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                                                                <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Slot Date</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {event.registrations.map((reg, idx) => {
                                                                const s = event.slots.find(sl => sl._id === reg.slotId);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-gray-50">
                                                                        <td className="px-4 py-2 text-sm text-gray-900">{reg.user.name}</td>
                                                                        <td className="px-4 py-2 text-sm text-gray-500">{reg.user.rollNumber}</td>
                                                                        <td className="px-4 py-2 text-sm text-gray-500">{reg.user.department}</td>
                                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                                            {s ? new Date(s.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', hour12: true }) : 'N/A'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
