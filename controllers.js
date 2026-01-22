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

        // If not admin, filter by target audience, gender, and batch
        if (req.user.role !== 'ADMIN') {
            const userBatch = req.user.batch; // e.g. "2027"

            console.log('--- Debug Event Filtering ---');
            console.log('User:', req.user.name);
            console.log('User Role:', req.user.role);
            console.log('User Attributes:', {
                type: req.user.studentType,
                gender: req.user.gender,
                batch: req.user.batch
            });

            query = {
                $and: [
                    // Fix: Allow events where isActive is true OR missing (legacy events)
                    {
                        $or: [
                            { isActive: true },
                            { isActive: { $exists: false } }
                        ]
                    },
                    {
                        $or: [
                            { targetAudience: 'Common' },
                            { targetAudience: req.user.studentType }
                        ]
                    },
                    {
                        $or: [
                            { targetGender: 'Common' },
                            { targetGender: req.user.gender }
                        ]
                    },
                    {
                        $or: [
                            { targetBatch: 'All' },
                            { targetBatch: userBatch }
                        ]
                    }
                ]
            };
            console.log('Generated Query:', JSON.stringify(query, null, 2));
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
    const { title, description, targetAudience, targetGender, targetBatch, slots } = req.body;

    try {
        // Basic validation
        if (!slots || slots.length === 0) {
            return res.status(400).json({ message: 'At least one slot is required.' });
        }

        const event = new Event({
            title,
            description,
            targetAudience,
            targetGender,
            targetBatch,
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
                    studentType: reg.user.studentType,
                    gender: reg.user.gender,
                    batch: reg.user.batch
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
                targetGender: event.targetGender,
                targetBatch: event.targetBatch,
                slots: event.slots,
                registrations: archivedRegistrations
            });

            // Delete from active collections
            await Registration.deleteMany({ event: event._id });
            await event.deleteOne();

            res.json({ message: 'Event moved to Recycle Bin (retained for 30 days)' });
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

            // Eligibility check - Student Type
            if (event.targetAudience !== 'Common' && event.targetAudience !== req.user.studentType) {
                throw new Error(`This event is only for ${event.targetAudience}s.`);
            }

            // Eligibility check - Gender
            if (event.targetGender !== 'Common' && event.targetGender !== req.user.gender) {
                throw new Error(`This event is only for ${event.targetGender} students.`);
            }

            // Eligibility check - Batch
            if (event.targetBatch !== 'All' && event.targetBatch !== req.user.batch) {
                throw new Error(`This event is only for batch ${event.targetBatch}.`);
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

        // 7. Trigger Notification Email (Async - Fire and Forget)
        // The email service now handles queuing internally.
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

        emailService.sendBookingConfirmation(
            req.user.email,
            req.user.name,
            eventInfo.title,
            slotInfo.startTime,
            slotInfo.startTime,
            slotInfo.endTime
        );

        // Check if FULL (optional: notify admin)
        if (slotInfo.bookedSlots >= slotInfo.totalSlots && adminEmail) {
            emailService.sendSlotFullEmail(
                adminEmail,
                eventInfo.title,
                new Date(slotInfo.startTime).toLocaleDateString(),
                new Date(slotInfo.startTime).toLocaleTimeString()
            );
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
            .populate('user', 'name email rollNumber department year studentType gender batch')
            .sort({ registeredAt: 1 });

        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Export registrations to Excel
// @route   GET /api/events/:id/export
// @access  Private/Admin
// @desc    Export registrations to Excel (Streamed)
// @route   GET /api/events/:id/export
// @access  Private/Admin
exports.exportEventRegistrations = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const registrations = await Registration.find({ event: eventId })
            .populate('user')
            .sort({ registeredAt: 1 });

        if (registrations.length === 0) {
            return res.status(404).json({ message: 'No registrations found to export' });
        }

        // Set Headers for Download
        const fileName = `Registrations_${event.title.replace(/\s+/g, '_')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });

        const formatTimeColumn = (date) => {
            return new Date(date).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: true
            }).toUpperCase();
        };

        const formatTimeSheet = (date) => {
            return new Date(date).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', hour12: false
            });
        };

        // Iterate slots and create sheets
        for (let i = 0; i < event.slots.length; i++) {
            const slot = event.slots[i];
            const slotIdStr = slot._id.toString();

            // Filter regs for this slot
            const slotRegs = registrations.filter(r => r.slotId && r.slotId.toString() === slotIdStr);

            // Create Sheet Name
            const index = i + 1;
            const timeRange = `${formatTimeSheet(slot.startTime)}-${formatTimeSheet(slot.endTime)}`;
            let sheetName = `${event.title.substring(0, 10)}.. - S${index}`; // Short & Safe

            const worksheet = workbook.addWorksheet(sheetName);

            // Add Columns
            worksheet.columns = [
                { header: 'Event Title', key: 'title', width: 20 },
                { header: 'Event Date', key: 'date', width: 15 },
                { header: 'Slot Time', key: 'time', width: 25 },
                { header: 'User Name', key: 'name', width: 20 },
                { header: 'Roll No', key: 'roll', width: 15 },
                { header: 'Department', key: 'dept', width: 15 },
                { header: 'Section', key: 'section', width: 10 },
                { header: 'Year', key: 'year', width: 10 },
                { header: 'Mobile', key: 'mobile', width: 15 },
                { header: 'Student Type', key: 'type', width: 15 },
                { header: 'Gender', key: 'gender', width: 10 },
                { header: 'Email', key: 'email', width: 25 },
                { header: 'Registration Date', key: 'regDate', width: 20 },
            ];

            // Add Rows
            slotRegs.forEach(reg => {
                const user = reg.user;
                if (user) {
                    worksheet.addRow({
                        title: event.title,
                        date: new Date(slot.startTime).toLocaleDateString('en-IN'),
                        time: `${formatTimeColumn(slot.startTime)} – ${formatTimeColumn(slot.endTime)}`,
                        name: user.name,
                        roll: user.rollNumber || 'N/A',
                        dept: user.department || 'N/A',
                        section: user.section || 'N/A',
                        year: user.year || 'N/A',
                        mobile: user.mobile || 'N/A',
                        type: user.studentType || 'N/A',
                        gender: user.gender || 'N/A',
                        email: user.email,
                        regDate: new Date(reg.registeredAt).toLocaleString('en-IN')
                    });
                }
            });

            worksheet.commit();
        }

        await workbook.commit();
        // res.end() is called automatically by commit() when using stream
    } catch (error) {
        console.error('Export Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server Error during Excel export' });
        }
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
        const slotId = registration.slotId;

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

// @desc    Restore an event from archive
// @route   POST /api/events/:id/restore
// @access  Private/Admin
exports.restoreEvent = async (req, res) => {
    try {
        const archivedEvent = await ArchivedEvent.findById(req.params.id);
        if (!archivedEvent) {
            return res.status(404).json({ message: 'Archived event not found' });
        }

        // Restore Event
        const newEvent = new Event({
            title: archivedEvent.title,
            description: archivedEvent.description,
            targetAudience: archivedEvent.targetAudience,
            targetGender: archivedEvent.targetGender,
            targetBatch: archivedEvent.targetBatch,
            slots: archivedEvent.slots,
            isActive: false // Restore as inactive initially
        });
        const savedEvent = await newEvent.save();

        // Restore Registrations
        if (archivedEvent.registrations && archivedEvent.registrations.length > 0) {
            for (const r of archivedEvent.registrations) {
                // Find user by email since we might not have ID if user was deleted (though unlikely)
                // We stored embedded user data, but for registration table we need user _id
                let user;
                if (r.user.email) {
                    user = await User.findOne({ email: r.user.email });
                }

                if (user) {
                    await Registration.create({
                        user: user._id,
                        event: savedEvent._id,
                        slotId: r.slotId,
                        registeredAt: r.registeredAt || Date.now()
                    });
                }
            }
        }

        await archivedEvent.deleteOne();
        res.json({ message: 'Event restored successfully' });
    } catch (error) {
        console.error('Restore Error:', error);
        res.status(500).json({ message: 'Server Error restoring event' });
    }
};

// @desc    Permanently delete an event
// @route   DELETE /api/events/archived/:id
// @access  Private/Admin
exports.permanentDeleteEvent = async (req, res) => {
    try {
        const archivedEvent = await ArchivedEvent.findById(req.params.id);
        if (archivedEvent) {
            await archivedEvent.deleteOne();
            res.json({ message: 'Event permanently deleted' });
        } else {
            res.status(404).json({ message: 'Archived event not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
