const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    targetAudience: {
        type: String,
        enum: ['Hosteller', 'Day Scholar', 'Common'],
        required: true
    },
    targetGender: {
        type: String,
        enum: ['Male', 'Female', 'Common'],
        default: 'Common',
        required: true
    },
    targetBatch: {
        type: String,
        default: 'All', // e.g. "2027", "2028" or "All"
        required: true
    },
    slots: [{
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date
        },
        totalSlots: {
            type: Number,
            required: true
        },
        bookedSlots: {
            type: Number,
            default: 0
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);
