const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['USER', 'ADMIN'],
        default: 'USER'
    },
    rollNumber: {
        type: String,
        unique: true,
        sparse: true // Allows null/undefined for existing admins, but we'll enforce for new users
    },
    department: {
        type: String,
        required: [true, 'Department is required']
    },
    section: {
        type: String,
        required: [true, 'Section is required']
    },
    year: {
        type: String,
        enum: ['1', '2', '3', '4', '5'],
        required: [true, 'Year is required']
    },
    mobile: {
        type: String
    },
    studentType: {
        type: String,
        enum: ['Day Scholar', 'Hosteller']
    },
    gender: {
        type: String,
        enum: ['Male', 'Female'],
        required: [true, 'Gender is required']
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    verificationTokenExpire: Date
});

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
