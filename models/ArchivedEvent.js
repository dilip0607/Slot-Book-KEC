const mongoose = require('mongoose');

const archivedEventSchema = new mongoose.Schema({
    originalEventId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: String,
    targetAudience: { type: String, required: true },
    targetGender: { type: String, default: 'Common' },
    targetBatch: { type: String, default: 'All' },
    slots: [{
        startTime: Date,
        endTime: Date,
        totalSlots: Number,
        bookedSlots: Number
    }],
    registrations: [{
        user: {
            name: String,
            email: String,
            rollNumber: String,
            department: String,
            year: String,
            studentType: String,
            gender: String,
            batch: String
        },
        slotId: mongoose.Schema.Types.ObjectId,
        bookedAt: Date
    }],
    deletedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ArchivedEvent', archivedEventSchema);
