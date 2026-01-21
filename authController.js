const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('./models/User');
const emailService = require('./emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
        expiresIn: '30d'
    });
};

exports.register = async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        rollNumber,
        department,
        section,
        year,
        mobile,
        studentType,
        gender,
        batch
    } = req.body;

    try {
        // Validation: Email Domain
        if (!email.endsWith('@kongu.edu') && role !== 'ADMIN') { // Allow admin to bypass in dev if needed, or strictly enforce
            // For strict enforcement as per requirements:
            // if (!email.endsWith('@kongu.edu'))
            if (!email.endsWith('@kongu.edu')) {
                return res.status(400).json({ message: 'Only @kongu.edu email addresses are allowed.' });
            }
        }

        // Validation: Mobile Number
        if (!/^\d{10}$/.test(mobile)) {
            return res.status(400).json({ message: 'Mobile number must be exactly 10 digits.' });
        }


        // Validation: Mandatory Fields
        if (!gender || !department || !section || !year || !batch) {
            return res.status(400).json({ message: 'All fields are mandatory' });
        }

        // Validation: Gender
        if (!['Male', 'Female'].includes(gender)) {
            return res.status(400).json({ message: 'Invalid gender selection' });
        }

        // Validation: Year
        if (!['1', '2', '3', '4', '5'].includes(year)) {
            return res.status(400).json({ message: 'Invalid year selection' });
        }

        // Validation: Department (Optional stricter check if needed, but schema handles type mostly)
        const allowedDepts = ['AIDS', 'AIML', 'AUTO', 'BSC', 'BS-CS', 'BS-IS', 'BS-SS', 'CHEM', 'CIVIL', 'CSD', 'CSE', 'ECE', 'EEE', 'EIE', 'FT', 'IT', 'MBA', 'MCA', 'MECH', 'MSC', 'MTS'];
        if (!allowedDepts.includes(department)) {
            return res.status(400).json({ message: 'Invalid department selection' });
        }

        // Validation: Section
        const allowedSections = ['A', 'B', 'C', 'D', 'E', 'F'];
        if (!allowedSections.includes(section)) {
            return res.status(400).json({ message: 'Invalid section selection' });
        }

        // Validation: Password Security
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,10}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                message: 'Password must be 6-10 characters long, contain at least one uppercase letter, one lowercase letter, and one special character.'
            });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const rollNumberExists = await User.findOne({ rollNumber });
        if (rollNumberExists) {
            return res.status(400).json({ message: 'Roll Number already exists' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'USER',
            rollNumber,
            department,
            section,
            year,
            mobile,
            studentType,
            gender,
            batch,
            verificationToken,
            verificationTokenExpire
        });

        if (user) {
            await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

            res.status(201).json({
                message: 'Registration successful! Please check your email to verify your account.'
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        if (error.code === 11000) {
            // Handle duplicate key error generically if missed above
            if (error.keyPattern.rollNumber) return res.status(400).json({ message: 'Roll Number already exists' });
            if (error.keyPattern.email) return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                return res.status(401).json({ message: 'Please verify your email to login' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                studentType: user.studentType,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Verify email via token
 */
exports.verifyEmail = async (req, res) => {
    try {
        const user = await User.findOne({
            verificationToken: req.params.token,
            verificationTokenExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send(`
                <div style="font-family: Arial; text-align: center; margin-top: 50px;">
                    <h1 style="color: #ef4444;">Verification Failed</h1>
                    <p>Invite link is invalid or has expired.</p>
                </div>
            `);
        }

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        let baseUrl = process.env.BASE_URL || 'http://localhost:3001';
        baseUrl = baseUrl.replace(/\/$/, '');

        res.redirect(`${baseUrl}/login?verified=true`);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get Reset Token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Set expire
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken);
            res.status(200).json({ message: 'Email sent' });
        } catch (err) {
            console.error(err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
    // Get hashed token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    try {
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password updated success' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
