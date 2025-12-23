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
