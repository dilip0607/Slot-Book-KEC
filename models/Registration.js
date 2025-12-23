const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate registration for same event by same user
registrationSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
