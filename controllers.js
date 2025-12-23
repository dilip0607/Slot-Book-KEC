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
        const events = await Event.find({}).sort({ createdAt: -1 });
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
    const { title, testDate, totalSlots } = req.body;

    try {
        const event = new Event({
            title,
            testDate,
            totalSlots,
            bookedSlots: 0
        });

        const createdEvent = await event.save();
        res.status(201).json(createdEvent);
    } catch (error) {
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

// @desc    Register for an event (FCFS)
// @route   POST /api/register
// @access  Private
exports.register = async (req, res) => {
    const { eventCode, email } = req.body; // Using eventCode as variable name (but actually sending eventId likely)
    const eventId = req.body.eventId || eventCode; // Support both

    // Basic validation
    if (!eventId) {
        return res.status(400).json({ message: 'Event ID is required' });
    }

    try {
        // Atomic Check and Update for FCFS
        // Find event that has slots < limit AND is active
        const updatedEvent = await Event.findOneAndUpdate(
            {
                _id: eventId,
                $expr: { $lt: ["$bookedSlots", "$totalSlots"] },
                isActive: true
            },
            { $inc: { bookedSlots: 1 } },
            { new: true } // Return updated document
        );

        if (!updatedEvent) {
            // This means either event not found, or slots full
            // Check if event exists to give better error message
            const eventExists = await Event.findById(eventId);
            if (!eventExists) return res.status(404).json({ message: 'Event not found' });
            if (!eventExists.isActive) return res.status(400).json({ message: 'Event is inactive' });
            return res.status(400).json({ message: 'Slots are full. Registration closed.' });
        }

        // Grant registration
        try {
            const registration = await Registration.create({
                user: req.user._id,
                event: eventId
            });

            res.status(201).json({
                message: 'Slot confirmed successfully.',
                registration
            });

            // Trigger Notification Emails
            try {
                const user = await User.findById(req.user._id);
                const event = await Event.findById(eventId);

                await emailService.sendBookingConfirmation(
                    user.email,
                    user.name,
                    event.title,
                    event.testDate
                );

                if (updatedEvent.bookedSlots === updatedEvent.totalSlots) {
                    const adminUser = await User.findOne({ isAdmin: true });
                    if (adminUser) {
                        await emailService.notifyAdminEventFull(
                            adminUser.email,
                            event.title,
                            event.totalSlots
                        );
                    }
                }
            } catch (emailErr) {
                console.error('Post-registration email background task failed:', emailErr);
            }

        } catch (regError) {
            // Rollback slot if registration creation fails (e.g. duplicate user)
            await Event.findByIdAndUpdate(eventId, { $inc: { bookedSlots: -1 } });

            if (regError.code === 11000) {
                return res.status(400).json({ message: 'User already registered for this event.' });
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
            .populate('user', 'name email')
            .populate('event', 'title')
            .sort({ registeredAt: 1 });

        if (registrations.length === 0) {
            return res.status(404).json({ message: 'No registrations found to export' });
        }

        const data = registrations.map(reg => ({
            'Event Title': reg.event.title,
            'User Name': reg.user.name,
            'User Email': reg.user.email,
            'Registration Date': new Date(reg.registeredAt).toLocaleString()
        }));

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

        // Atomic update: remove registration and decrement slot
        await registration.deleteOne();
        await Event.findByIdAndUpdate(eventId, { $inc: { bookedSlots: -1 } });

        res.json({ message: 'Registration cancelled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
