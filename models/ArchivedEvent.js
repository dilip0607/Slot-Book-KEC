const mongoose = require('mongoose');

const archivedEventSchema = new mongoose.Schema({
    originalEventId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    title: String,
    description: String,
    targetAudience: String,
    slots: Array,
    registrations: [{
        originalRegistrationId: mongoose.Schema.Types.ObjectId,
        user: {
            name: String,
            email: String,
            rollNumber: String,
            department: String,
            year: String,
            mobile: String,
            studentType: String
        },
        slotId: mongoose.Schema.Types.ObjectId,
        registeredAt: Date
    }],
    deletedAt: {
        type: Date,
        default: Date.now,
        index: { expires: '30d' } // Automatically delete after 30 days
    }
});

module.exports = mongoose.model('ArchivedEvent', archivedEventSchema);
