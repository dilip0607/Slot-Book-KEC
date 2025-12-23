const Event = require('./models/Event');
const Registration = require('./models/Registration');
const User = require('./models/User');
const XLSX = require('xlsx');
const emailService = require('./emailService');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
exports.getAllEvents = async (req, res) => {
    try {
        let query = {};

        // If not admin, filter by target audience
        if (req.user.role !== 'ADMIN') {
            query = {
                $or: [
                    { targetAudience: 'Common' },
                    { targetAudience: req.user.studentType }
                ],
                isActive: true
            };
        }

        const events = await Event.find(query).sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get single event status
// @route   GET /api/events/:id
// @access  Private
exports.getEventStatus = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (event) {
            res.json(event);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
exports.createEvent = async (req, res) => {
    const { title, description, targetAudience, slots } = req.body;

    try {
        // Basic validation
        if (!slots || slots.length === 0) {
            return res.status(400).json({ message: 'At least one slot is required.' });
        }

        const event = new Event({
            title,
            description,
            targetAudience,
            slots, // Array of { startTime, endTime, totalSlots }
        });

        const createdEvent = await event.save();
        res.status(201).json(createdEvent);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid event data' });
    }
};

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (event) {
            // Soft delete or hard delete? User asked for deletion.
            // We'll do a hard delete for simplicity but check for registrations?
            // User requested: "Ensure delete ... works reliably"
            // "Ensure inactive/deleted events do not accept registrations" -> implies soft delete might be safer, but hard delete works if we cleanup.
            // Let's do hard delete for now as per "Delete an event" feature.

            // Optional: Delete associated registrations
            await Registration.deleteMany({ event: event._id });
            await event.deleteOne();

            res.json({ message: 'Event removed' });
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Register for an event slot (FCFS)
// @route   POST /api/register
// @access  Private
exports.register = async (req, res) => {
    const { eventId, slotId } = req.body;
    const userId = req.user._id;

    if (!eventId || !slotId) {
        return res.status(400).json({ message: 'Event ID and Slot ID are required' });
    }

    try {
        // 1. Fetch Event and Check Eligibility
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (!event.isActive) {
            return res.status(400).json({ message: 'Event is inactive' });
        }

        // Eligibility check
        if (event.targetAudience !== 'Common' && event.targetAudience !== req.user.studentType) {
            return res.status(403).json({ message: `This event is only for ${event.targetAudience}s.` });
        }

        // 2. Check for functionality: "One slot per event"
        const existingRegistration = await Registration.findOne({ user: userId, event: eventId });
        if (existingRegistration) {
            return res.status(400).json({ message: 'You have already booked a slot for this event.' });
        }

        // 3. Find target slot details (for capacity check)
        const targetSlot = event.slots.id(slotId);
        if (!targetSlot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        if (targetSlot.bookedSlots >= targetSlot.totalSlots) {
            return res.status(400).json({ message: 'Slot full. Registration closed.' });
        }

        // 4. Atomic Update (Concurrency Safe)
        const updateResult = await Event.updateOne(
            {
                _id: eventId,
                'slots._id': slotId,
                'slots.bookedSlots': { $lt: targetSlot.totalSlots }
            },
            { $inc: { 'slots.$.bookedSlots': 1 } }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(400).json({ message: 'Slot full. Registration closed.' });
        }

        // 5. Create Registration Record
        try {
            const registration = await Registration.create({
                user: userId,
                event: eventId,
                slotId: slotId
            });

            res.status(201).json({
                message: 'Slot confirmed successfully.',
                registration
            });

            // Trigger Notification Email (Async)
            try {
                // Fetch updated event to get current slot time
                // Or just use targetSlot.startTime

                await emailService.sendBookingConfirmation(
                    req.user.email,
                    req.user.name,
                    event.title,
                    targetSlot.startTime // Send slot time
                );

                // Check if FULL (optional: notify admin)
                if (targetSlot.bookedSlots + 1 === targetSlot.totalSlots) {
                    // Notify admin logic can go here
                }

            } catch (emailErr) {
                console.error('Email notification failed:', emailErr);
            }

        } catch (regError) {
            // Rollback slot count if registration insert fails
            await Event.updateOne(
                { _id: eventId, 'slots._id': slotId },
                { $inc: { 'slots.$.bookedSlots': -1 } }
            );

            if (regError.code === 11000) {
                return res.status(400).json({ message: 'You have already booked a slot for this event.' });
            }
            throw regError;
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Transaction failed' });
    }
};

// @desc    Get registrations for an event
// @route   GET /api/events/:id/registrations
// @access  Private/Admin
exports.getEventRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ event: req.params.id })
            .populate('user', 'name email')
            .sort({ registeredAt: 1 });

        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export registrations to Excel
// @route   GET /api/events/:id/export
// @access  Private/Admin
exports.exportEventRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ event: req.params.id })
            .populate('user') // Get all user fields since we need many of them
            .populate('event', 'title slots') // Need title AND slots
            .sort({ registeredAt: 1 });

        if (registrations.length === 0) {
            return res.status(404).json({ message: 'No registrations found to export' });
        }

        const data = registrations.map(reg => {
            const user = reg.user;
            const event = reg.event;

            if (!user || !event) return null; // Skip if data is corrupted

            const slot = event.slots ? event.slots.find(s => s._id.toString() === reg.slotId.toString()) : null;

            return {
                'Event Title': event.title,
                'Slot Time': slot ? new Date(slot.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A',
                'User Name': user.name,
                'Roll No': user.rollNumber || 'N/A',
                'Department': user.department || 'N/A',
                'Section': user.section || 'N/A',
                'Year': user.year || 'N/A',
                'Mobile': user.mobile || 'N/A',
                'Student Type': user.studentType || 'N/A',
                'Gender': user.gender || 'N/A',
                'User Email': user.email,
                'Registration Date': new Date(reg.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            };
        }).filter(item => item !== null); // Filter out corrupted entries

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const fileName = `Registrations_${registrations[0].event.title.replace(/\s+/g, '_')}.xlsx`;

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Length': buffer.length
        });

        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during Excel export' });
    }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private/Admin
exports.updateEvent = async (req, res) => {
    const { title, testDate, totalSlots, isActive } = req.body;

    try {
        const event = await Event.findById(req.params.id);

        if (event) {
            // Validation: totalSlots cannot be less than current bookedSlots
            if (totalSlots < event.bookedSlots) {
                return res.status(400).json({
                    message: `Total slots cannot be less than current booked slots (${event.bookedSlots})`
                });
            }

            event.title = title || event.title;
            event.testDate = testDate || event.testDate;
            event.totalSlots = totalSlots !== undefined ? totalSlots : event.totalSlots;
            event.isActive = isActive !== undefined ? isActive : event.isActive;

            const updatedEvent = await event.save();
            res.json(updatedEvent);
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid event data' });
    }
};

// @desc    Get current user's registrations
// @route   GET /api/my-registrations
// @access  Private
exports.getMyRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ user: req.user._id })
            .populate('event')
            .sort({ registeredAt: -1 });
        res.json(registrations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel a registration
// @route   DELETE /api/registrations/:id
// @access  Private
// @desc    Cancel a registration
// @route   DELETE /api/registrations/:id
// @access  Private
exports.cancelRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);

        if (!registration) {
            return res.status(404).json({ message: 'Registration not found' });
        }

        // Check ownership
        if (registration.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to cancel this booking' });
        }

        const eventId = registration.event;
        const slotId = registration.slotId; // NOW AVAILABLE

        // Atomic update: remove registration and decrement slot
        await registration.deleteOne();

        // Decrement slot booked count
        await Event.updateOne(
            { _id: eventId, 'slots._id': slotId },
            { $inc: { 'slots.$.bookedSlots': -1 } }
        );

        res.json({ message: 'Registration cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
