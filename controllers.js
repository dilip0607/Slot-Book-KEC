const Event = require('./models/Event');
const Registration = require('./models/Registration');
const User = require('./models/User');
const ArchivedEvent = require('./models/ArchivedEvent');
const XLSX = require('xlsx');
const emailService = require('./emailService');
const mongoose = require('mongoose');

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
            slots: slots.map(s => ({
                ...s,
                startTime: new Date(s.startTime), // Full Date Object
                endTime: new Date(s.endTime)     // Full Date Object
            })),
        });

        const createdEvent = await event.save();
        res.status(201).json(createdEvent);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid event data' });
    }
};

// @desc    Delete an event (Archive it first)
// @route   DELETE /api/events/:id
// @access  Private/Admin
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (event) {
            // Fetch registrations to archive
            const registrations = await Registration.find({ event: event._id }).populate('user');

            const archivedRegistrations = registrations.map(reg => ({
                originalRegistrationId: reg._id,
                user: reg.user ? {
                    name: reg.user.name,
                    email: reg.user.email,
                    rollNumber: reg.user.rollNumber,
                    department: reg.user.department,
                    year: reg.user.year,
                    mobile: reg.user.mobile,
                    studentType: reg.user.studentType
                } : {}, // Handle case if user is null
                slotId: reg.slotId,
                registeredAt: reg.registeredAt
            }));

            // Create Archived Event
            await ArchivedEvent.create({
                originalEventId: event._id,
                title: event.title,
                description: event.description,
                targetAudience: event.targetAudience,
                slots: event.slots,
                registrations: archivedRegistrations
            });

            // Delete from active collections
            await Registration.deleteMany({ event: event._id });
            await event.deleteOne();

            res.json({ message: 'Event moved to archive (retained for 30 days)' });
        } else {
            res.status(404).json({ message: 'Event not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error during deletion' });
    }
};

// @desc    Register for an event slot (FCFS) - TRANSACTIONAL
// @route   POST /api/register
// @access  Private
exports.register = async (req, res) => {
    const { eventId, slotId } = req.body;
    const userId = req.user._id;

    if (!eventId || !slotId) {
        return res.status(400).json({ message: 'Event ID and Slot ID are required' });
    }

    // Start a MongoDB session for the transaction
    const session = await mongoose.startSession();

    try {
        let transactionResult = null;
        let finalRegistration = null;
        let eventInfo = null;
        let slotInfo = null;

        // Perform transaction
        await session.withTransaction(async () => {
            // 1. Fetch Event and Check Eligibility (read with session)
            const event = await Event.findById(eventId).session(session);
            if (!event) {
                throw new Error('Event not found');
            }
            if (!event.isActive) {
                throw new Error('Event is inactive');
            }

            // Eligibility check
            if (event.targetAudience !== 'Common' && event.targetAudience !== req.user.studentType) {
                throw new Error(`This event is only for ${event.targetAudience}s.`);
            }

            // 2. Check overlap: "One slot per event"
            const existingRegistration = await Registration.findOne({ user: userId, event: eventId }).session(session);
            if (existingRegistration) {
                const error = new Error('You have already booked a slot for this event.');
                error.statusCode = 400;
                throw error;
            }

            // 3. Find target slot details (for capacity check)
            const targetSlot = event.slots.id(slotId);
            if (!targetSlot) {
                throw new Error('Slot not found');
            }

            // Strict Capacity Check
            if (targetSlot.bookedSlots >= targetSlot.totalSlots) {
                const error = new Error('Slot full. Registration closed.');
                error.statusCode = 400;
                throw error;
            }

            // 4. Atomic Update: Increment bookedSlots
            targetSlot.bookedSlots += 1;
            await event.save({ session }); // Save event with updated slot count

            // 5. Create Registration Record
            const registration = new Registration({
                user: userId,
                event: eventId,
                slotId: slotId
            });
            await registration.save({ session });

            // Store data for outside transaction (email)
            finalRegistration = registration;
            eventInfo = event;
            slotInfo = targetSlot;
        });

        // End Session
        await session.endSession();

        // 6. Success Response
        res.status(201).json({
            message: 'Slot confirmed successfully.',
            registration: finalRegistration
        });

        // 7. Trigger Notification Email (Async - outside transaction)
        try {
            await emailService.sendBookingConfirmation(
                req.user.email,
                req.user.name,
                eventInfo.title,
                slotInfo.startTime, // Date object (for Date)
                slotInfo.startTime, // Date object (for Start Time)
                slotInfo.endTime    // Date object (for End Time)
            );

            // Check if FULL (optional: notify admin)
            if (slotInfo.bookedSlots >= slotInfo.totalSlots) {
                // Admin notification logic here
                // console.log(`Slot ${slotInfo._id} for event ${eventInfo.title} is now FULL.`);
            }
        } catch (emailErr) {
            console.error('Email notification failed:', emailErr);
            // Don't fail the request if email fails, booking is secure
        }

    } catch (error) {
        await session.endSession();
        console.error('Transaction Aborted:', error.message);

        const status = error.statusCode || (error.message.includes('Slot full') ? 400 : 500);
        const msg = error.message === 'Event not found' || error.message === 'Slot not found'
            ? error.message
            : (status === 400 ? error.message : 'Transaction failed: ' + error.message);

        res.status(status).json({ message: msg });
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
                'Event Target Audience': event.targetAudience || 'N/A',
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

// @desc    Get all archived events
// @route   GET /api/events/archived
// @access  Private/Admin
exports.getArchivedEvents = async (req, res) => {
    try {
        const archivedEvents = await ArchivedEvent.find().sort({ deletedAt: -1 });
        res.json(archivedEvents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching archived events' });
    }
};
